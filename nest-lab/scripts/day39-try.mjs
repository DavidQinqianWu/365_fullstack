// Day 39 观察脚本:锁 —— 行锁与 NOWAIT / lock_timeout、外键检查拿的锁、SKIP LOCKED 任务队列(4 个 worker × 200 个任务)、
// DDL 锁队列把普通 SELECT 卡住与 lock_timeout + 重试、死锁与按顺序加锁、谁挡住了谁、咨询锁。
//
// 跑:npm run day39   # 本机约 10 秒
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// 表都在独立的 schema day39 里,每次运行都会先删掉重建;不碰 app 和 app_test。
// 每个连接都设了 statement_timeout = 10s 兜底:就算哪一步写错了,也不会把脚本永远挂住。
// 手动版(两三个 psql 窗口)见 sql/day39/02、04、05、07 里的注释。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
try {
  process.loadEnvFile(`${ROOT}.env`);
} catch {
  // 没有 .env 就用默认值
}
const env = {
  ...process.env,
  PGHOST: process.env.POSTGRES_HOST ?? 'localhost',
  PGPORT: process.env.POSTGRES_PORT ?? '5432',
  PGUSER: process.env.POSTGRES_USER ?? 'nest_lab',
  PGPASSWORD: process.env.POSTGRES_PASSWORD ?? 'nest_lab_dev',
  PGDATABASE: process.env.POSTGRES_DB ?? 'nest_lab',
  PGCONNECT_TIMEOUT: '3',
  PGAPPNAME: 'day39',
};
const URL_ = `postgresql://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`;
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);
const fail = (title, hint) => {
  out(`\n❌ ${title}\n${hint}`);
  process.exit(1);
};
const PSQL = 'psql -w -X "$@" 2>&1';
const run = (args) => spawnSync('sh', ['-c', PSQL, 'sh', ...args], { cwd: ROOT, env, encoding: 'utf8', timeout: 60_000 });
const runFile = (f) => {
  const r = run(['-f', `sql/day39/${f}`]);
  if (r.status !== 0 || /ERROR/.test(r.stdout)) fail(`${f} 执行失败`, r.stdout);
  out(r.stdout.trimEnd());
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ms = (t) => `${(performance.now() - t).toFixed(0)} ms`;
const t0 = Date.now();

// ---------- 第 0 幕:数据库在不在 ----------
line('第 0 幕:检查数据库');
const probe = spawnSync('psql', ['-w', '-X', '-At', '-c', 'SELECT version()'], { env, encoding: 'utf8', timeout: 10_000 });
if (probe.error) fail('找不到 psql 命令', '  安装方法见 Day 22 讲义「先跑起来」;或者用 docker compose exec postgres psql …');
if (probe.status !== 0) {
  fail(
    `连不上 ${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`,
    `  psql 说:${probe.stderr.trim()}\n  · Docker:docker compose up -d,等 docker compose ps 显示 healthy\n  · 本机安装:确认服务已启动、.env 里的 POSTGRES_* 与建库时一致(见 Day 22 讲义)`,
  );
}
out(`服务器:${probe.stdout.trim().split(' on ')[0]}`);
const { default: pg } = await import('pg');
const connect = async (name) => {
  const c = new pg.Client({ connectionString: URL_, options: '-c search_path=day39 -c statement_timeout=10s', application_name: name });
  c.on('error', () => {});
  await c.connect();
  return c;
};
// 执行一条语句,返回 { rows } 或 { err };不抛出
const tryQ = async (c, sql, params) => {
  try {
    return { rows: (await c.query(sql, params)).rows };
  } catch (err) {
    return { err };
  }
};
const errText = (e) => `ERROR ${e.code} ${e.message}`;

line('第 1 幕:准备数据(01-setup.sql)');
runFile('01-setup.sql');

// ---------- 第 2 幕:行锁 ----------
line('第 2 幕:行锁 —— FOR UPDATE、NOWAIT、lock_timeout、外键检查拿的锁(02-row-locks.sql 有手动步骤)');
{
  const a = await connect('A');
  const b = await connect('B');
  await a.query('BEGIN');
  await a.query('SELECT * FROM accounts WHERE id = 1 FOR UPDATE');
  const ax = (await a.query('SELECT pg_current_xact_id()::text AS x')).rows[0].x;
  out(`  A:BEGIN; SELECT … WHERE id = 1 FOR UPDATE(A 的事务号 ${ax})`);
  let t = performance.now();
  const r1 = await tryQ(b, 'SELECT balance, xmax::text FROM accounts WHERE id = 1');
  out(`  B:普通 SELECT → balance = ${r1.rows[0].balance},${ms(t)}(行锁不挡读);这一行的 xmax = ${r1.rows[0].xmax}(= A 的事务号:行锁记在行头)`);
  await b.query("SET lock_timeout = '500ms'");
  t = performance.now();
  const r2 = await tryQ(b, 'UPDATE accounts SET balance = balance + 1 WHERE id = 1');
  out(`  B:UPDATE 同一行(lock_timeout 500ms)→ ${errText(r2.err)},${ms(t)}`);
  t = performance.now();
  const r3 = await tryQ(b, 'SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT');
  out(`  B:SELECT … FOR UPDATE NOWAIT → ${errText(r3.err)},${ms(t)}`);
  const r4 = await tryQ(b, 'SELECT * FROM accounts WHERE id = 1 FOR SHARE NOWAIT');
  out(`  B:SELECT … FOR SHARE NOWAIT → ${r4.err ? errText(r4.err) : '拿到了'}(FOR SHARE 和 FOR UPDATE 冲突)`);
  t = performance.now();
  const r5 = await tryQ(b, 'INSERT INTO transfers (account_id, amount) VALUES (1, 10)');
  out(`  B:INSERT 一笔引用 1 号账户的转账(外键检查要 FOR KEY SHARE)→ ${r5.err ? errText(r5.err) : '成功'},${ms(t)}`);
  await a.query('ROLLBACK');

  await a.query('BEGIN');
  await a.query('UPDATE accounts SET balance = balance - 1 WHERE id = 1');
  out('\n  A:BEGIN; UPDATE accounts SET balance = … WHERE id = 1(普通 UPDATE 拿的是 FOR NO KEY UPDATE)');
  t = performance.now();
  const r6 = await tryQ(b, 'INSERT INTO transfers (account_id, amount) VALUES (1, 10)');
  out(`  B:同样的 INSERT → ${r6.err ? errText(r6.err) : '成功'},${ms(t)}(FOR NO KEY UPDATE 不挡外键检查)`);
  const r7 = await tryQ(b, 'SELECT * FROM accounts WHERE id = 1 FOR NO KEY UPDATE NOWAIT');
  out(`  B:SELECT … FOR NO KEY UPDATE NOWAIT → ${r7.err ? errText(r7.err) : '拿到了'}(两个写同一行仍然冲突)`);
  await a.query('ROLLBACK');
  await a.end();
  await b.end();
}

// ---------- 第 3 幕:SKIP LOCKED 任务队列 ----------
line('第 3 幕:任务队列 —— 4 个 worker 并发领 200 个任务(03-skip-locked.sql 是一个 worker 的一次循环)');
async function runQueue(skipLocked) {
  run(['-c', "UPDATE day39.jobs SET status = 'pending', worker = NULL, times_done = 0, finished_at = NULL"]);
  const workers = await Promise.all(['W1', 'W2', 'W3', 'W4'].map((n) => connect(n)));
  const claimSql = `SELECT id FROM jobs WHERE status = 'pending' ORDER BY id FOR UPDATE${skipLocked ? ' SKIP LOCKED' : ''} LIMIT 1`;
  const stats = { waitedMs: 0, emptyButPending: 0 };
  const start = performance.now();
  await Promise.all(
    workers.map(async (c) => {
      for (;;) {
        await c.query('BEGIN');
        const t = performance.now();
        const { rows } = await c.query(claimSql);
        const waited = performance.now() - t;
        if (waited > 2) stats.waitedMs += waited; // 领任务这一步花了 2 ms 以上,基本就是在等别人的锁
        if (rows.length === 0) {
          await c.query('COMMIT');
          // 不加 SKIP LOCKED 时有个坑:等到锁之后,那一行已经被别人标成 done,不再满足 WHERE → 返回 0 行,但队列里其实还有任务
          const left = (await c.query("SELECT count(*)::int AS n FROM jobs WHERE status = 'pending'")).rows[0].n;
          if (left === 0) return;
          stats.emptyButPending++;
          continue;
        }
        await sleep(5); // 假装处理了 5 ms
        await c.query("UPDATE jobs SET status = 'done', worker = $2, times_done = times_done + 1, finished_at = clock_timestamp() WHERE id = $1", [rows[0].id, c.connectionParameters.application_name]);
        await c.query('COMMIT');
      }
    }),
  );
  const elapsed = performance.now() - start;
  await Promise.all(workers.map((c) => c.end()));
  const r = run(['-At', '-F', '|', '-c', "SELECT count(*), count(*) FILTER (WHERE times_done = 1), coalesce(max(times_done), 0), (SELECT string_agg(worker || '=' || n, ' ' ORDER BY worker) FROM (SELECT worker, count(*) AS n FROM day39.jobs GROUP BY worker) w) FROM day39.jobs WHERE status = 'done'"]).stdout.trim().split('|');
  return { elapsed, done: r[0], once: r[1], maxTimes: r[2], perWorker: r[3], ...stats };
}
for (const skip of [true, false]) {
  const s = await runQueue(skip);
  out(`  ${skip ? 'FOR UPDATE SKIP LOCKED' : 'FOR UPDATE(不加 SKIP LOCKED)'}`);
  out(`    用时 ${s.elapsed.toFixed(0)} ms;完成 ${s.done} 个,其中恰好处理了 1 次的 ${s.once} 个,最多被处理 ${s.maxTimes} 次`);
  out(`    各 worker 分到:${s.perWorker}`);
  out(`    领任务时花在等锁上的时间合计 ${s.waitedMs.toFixed(0)} ms;「等到锁却领了个空、其实队列里还有」${s.emptyButPending} 次`);
}

// ---------- 第 4 幕:DDL 锁队列 ----------
line('第 4 幕:DDL 锁队列 —— 一个 ALTER TABLE 在排队,后面的普通 SELECT 也被挡住(04-ddl-lock-queue.sql)');
runFile('04-ddl-lock-queue.sql');
{
  const a = await connect('A-reader');
  const b = await connect('B-migration');
  const c = await connect('C-request');
  const w = await connect('watcher');
  await a.query('BEGIN');
  await a.query('SELECT count(*) FROM big');
  out('\n  A:BEGIN; SELECT count(*) FROM big;(拿着 ACCESS SHARE,事务不结束)');
  const tb = performance.now();
  const bAlter = tryQ(b, 'ALTER TABLE big ADD COLUMN note text');
  await sleep(200);
  out('  B:ALTER TABLE big ADD COLUMN note text;(要 ACCESS EXCLUSIVE → 排队)');
  await c.query("SET statement_timeout = '1500ms'");
  const tc = performance.now();
  const cSel = tryQ(c, 'SELECT count(*) AS n FROM big');
  await sleep(300);
  out('  C:SELECT count(*) FROM big;(一个普通请求)');
  const who = (await w.query(
    `SELECT a.application_name AS who, a.wait_event_type || ':' || a.wait_event AS waiting_for, pg_blocking_pids(a.pid) AS blocked_by,
            (SELECT string_agg(x.application_name, ',') FROM pg_stat_activity x WHERE x.pid = ANY (pg_blocking_pids(a.pid))) AS blocked_by_name,
            left(a.query, 40) AS query
     FROM pg_stat_activity a WHERE a.application_name IN ('B-migration', 'C-request') ORDER BY a.application_name`,
  )).rows;
  out('  此刻 pg_blocking_pids(谁挡住了谁):');
  for (const r of who) out(`    ${r.who.padEnd(12)} 在等 ${r.waiting_for.padEnd(18)} 被 ${r.blocked_by_name}(pid ${r.blocked_by})挡住   ${r.query}`);
  const cr = await cSel;
  out(`  C 的结果:${cr.err ? errText(cr.err) : `n = ${cr.rows[0].n}`},${ms(tc)}(本来和 A 一点也不冲突)`);
  await a.query('COMMIT');
  const br = await bAlter;
  out(`  A:COMMIT → B 的 ALTER ${br.err ? errText(br.err) : '完成'},从开始排队算共 ${ms(tb)}`);
  await b.query('ALTER TABLE big DROP COLUMN note');

  out('\n  —— 线上的做法:迁移设 lock_timeout,拿不到锁就放弃、过一会儿重试 ——');
  await a.query('BEGIN');
  await a.query('SELECT count(*) FROM big');
  await b.query("SET lock_timeout = '200ms'");
  const releaseA = sleep(1000).then(() => a.query('COMMIT')); // A 1 秒后结束
  let attempt = 0;
  const tStart = performance.now();
  const cSel2 = (async () => {
    await sleep(50);
    const t = performance.now();
    const r = await tryQ(c, 'SELECT count(*) AS n FROM big');
    return { r, took: performance.now() - t };
  })();
  for (;;) {
    attempt++;
    const r = await tryQ(b, 'ALTER TABLE big ADD COLUMN note text');
    if (!r.err) {
      out(`  B 第 ${attempt} 次:成功(${ms(tStart)})`);
      break;
    }
    out(`  B 第 ${attempt} 次:${errText(r.err)} → 等 100 ms 再试`);
    if (attempt >= 20) break;
    await sleep(100);
  }
  const c2 = await cSel2;
  out(`  同一时间 C 的普通 SELECT:${c2.r.err ? errText(c2.r.err) : `n = ${c2.r.rows[0].n}`},用了 ${c2.took.toFixed(0)} ms(最多被挡 200 ms)`);
  await releaseA;
  await b.query('ALTER TABLE big DROP COLUMN IF EXISTS note');
  for (const x of [a, b, c, w]) await x.end();
}

// ---------- 第 5 幕:死锁 ----------
line('第 5 幕:死锁 —— 两个事务以相反的顺序改两行(05-deadlock.sql)');
runFile('05-deadlock.sql');
{
  const a = await connect('A');
  const b = await connect('B');
  await a.query('BEGIN');
  await b.query('BEGIN');
  await a.query('UPDATE accounts SET balance = balance - 10 WHERE id = 1');
  out('  A:UPDATE id = 1(锁住 1 号)');
  await b.query('UPDATE accounts SET balance = balance - 10 WHERE id = 2');
  out('  B:UPDATE id = 2(锁住 2 号)');
  const t = performance.now();
  const aWait = tryQ(a, 'UPDATE accounts SET balance = balance + 10 WHERE id = 2');
  await sleep(100);
  out('  A:UPDATE id = 2 → 等 B');
  const bWait = tryQ(b, 'UPDATE accounts SET balance = balance + 10 WHERE id = 1');
  out('  B:UPDATE id = 1 → 等 A');
  const [ra, rb] = await Promise.all([aWait, bWait]);
  for (const [who, r, c] of [['A', ra, a], ['B', rb, b]]) {
    if (r.err) {
      out(`  ${who}:${errText(r.err)}(${ms(t)} 后)`);
      if (r.err.detail) out(`     DETAIL: ${r.err.detail.replaceAll('\n', '\n             ')}`);
      if (r.err.hint) out(`     HINT:   ${r.err.hint}`);
      await c.query('ROLLBACK');
    } else {
      out(`  ${who}:UPDATE 成功(另一个被回滚后,它拿到了锁)`);
      await c.query('COMMIT');
    }
  }
  run(['-c', 'UPDATE day39.accounts SET balance = CASE id WHEN 1 THEN 100 ELSE 50 END']);

  out('\n  —— 修法:按固定顺序(id 从小到大)一次锁住要改的所有行 ——');
  const lockBoth = 'SELECT id FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE';
  await a.query('BEGIN');
  await b.query('BEGIN');
  await a.query(lockBoth);
  out('  A:SELECT … WHERE id IN (1, 2) ORDER BY id FOR UPDATE → 拿到两行');
  const t2 = performance.now();
  const bLock = tryQ(b, lockBoth).then((r) => ({ r, took: performance.now() - t2 }));
  await sleep(300);
  out('  B:同样的语句 → 等 A(是排队,不是互相等)');
  await a.query('UPDATE accounts SET balance = balance - 10 WHERE id = 1');
  await a.query('UPDATE accounts SET balance = balance + 10 WHERE id = 2');
  await a.query('COMMIT');
  out('  A:改完两行,COMMIT');
  const bl = await bLock;
  out(`  B:${bl.r.err ? errText(bl.r.err) : '拿到两行'},等了 ${bl.took.toFixed(0)} ms`);
  await b.query('UPDATE accounts SET balance = balance + 10 WHERE id = 1');
  await b.query('UPDATE accounts SET balance = balance - 10 WHERE id = 2');
  await b.query('COMMIT');
  out(`  B:改完两行,COMMIT;最终余额 ${run(['-At', '-c', "SELECT string_agg(owner || '=' || balance, ' ' ORDER BY id) FROM day39.accounts"]).stdout.trim()}(两笔转账都成功,没有死锁)`);
  await a.end();
  await b.end();
}

// ---------- 第 6 幕:咨询锁 ----------
line('第 6 幕:咨询锁 —— 3 个连接同时抢同一个「值班牌」(07-advisory.sql)');
runFile('07-advisory.sql');
{
  const cs = await Promise.all(['副本 1', '副本 2', '副本 3'].map((n) => connect(n)));
  const got = await Promise.all(cs.map((c) => c.query('SELECT pg_try_advisory_lock(42) AS ok').then((r) => r.rows[0].ok)));
  cs.forEach((c, i) => out(`  ${c.connectionParameters.application_name}:pg_try_advisory_lock(42) → ${got[i]}`));
  out(`  拿到的个数:${got.filter(Boolean).length}`);
  const winner = got.indexOf(true);
  await cs[winner].query('SELECT pg_advisory_unlock(42)');
  const second = await cs[(winner + 1) % 3].query('SELECT pg_try_advisory_lock(42) AS ok');
  out(`  ${cs[winner].connectionParameters.application_name} 释放之后,${cs[(winner + 1) % 3].connectionParameters.application_name} 再试 → ${second.rows[0].ok}`);
  await Promise.all(cs.map((c) => c.end())); // 断开连接也会释放会话级咨询锁
}

out(`\n观察结束(用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒):表留在 schema day39 里,可以开两三个 psql 窗口按 sql/day39/ 里的注释手动做一遍`);
