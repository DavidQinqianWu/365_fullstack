// Day 36 观察脚本:事务与 ACID —— 原子性、一致性(可延迟外键)、隔离性(最小演示)、持久性(WAL、synchronous_commit)、
// aborted 状态、保存点、DDL 回滚、now() vs clock_timestamp(),以及 nest-lab 的 transaction() 修复在真实 PostgreSQL 上的表现。
//
// 跑:npm run day36              # 本机约 15 秒
//     npm run day36 -- --crash   # 额外做「真的崩溃一次」:kill -9 一个后端进程,PostgreSQL 整体崩溃恢复(约 +20 秒)
//                                 # ⚠️ 只在本机安装的 PostgreSQL、用 root(或 postgres 用户)运行时才做;会断开这台数据库上的所有连接
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// 表都在独立的 schema day36 / day36_app 里,每次运行都会先删掉重建;不碰 app 和 app_test。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
try {
  process.loadEnvFile(`${ROOT}.env`);
} catch {
  // 没有 .env 就用默认值
}
const CRASH = process.argv.includes('--crash');
const env = {
  ...process.env,
  PGHOST: process.env.POSTGRES_HOST ?? 'localhost',
  PGPORT: process.env.POSTGRES_PORT ?? '5432',
  PGUSER: process.env.POSTGRES_USER ?? 'nest_lab',
  PGPASSWORD: process.env.POSTGRES_PASSWORD ?? 'nest_lab_dev',
  PGDATABASE: process.env.POSTGRES_DB ?? 'nest_lab',
  PGCONNECT_TIMEOUT: '3',
  PGAPPNAME: 'day36',
};
const URL_ = `postgresql://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`;
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);
const fail = (title, hint) => {
  out(`\n❌ ${title}\n${hint}`);
  process.exit(1);
};
const PSQL = 'psql -w -X "$@" 2>&1';
const run = (args) => spawnSync('sh', ['-c', PSQL, 'sh', ...args], { cwd: ROOT, env, encoding: 'utf8', timeout: 120_000 });
const runFile = (f) => {
  const r = run(['-f', `sql/day36/${f}`]);
  out(r.stdout.trimEnd());
  if (r.status !== 0) fail(`${f} 执行失败`, '  看上面 psql 的输出');
  return r.stdout;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
const connect = async (opts = {}) => {
  const c = new pg.Client({ connectionString: URL_, ...opts });
  c.on('error', () => {}); // 连接被杀掉时 Client 会发 error 事件;这里只关心 query 的结果
  await c.connect();
  return c;
};

line('第 1 幕:准备数据(01-setup.sql)');
runFile('01-setup.sql');

line('第 2 幕:原子性(02-atomicity.sql)');
runFile('02-atomicity.sql');

line('第 3 幕:一致性(03-consistency.sql)');
runFile('03-consistency.sql');

// ---------- 第 4 幕:隔离性,两个连接 ----------
line('第 4 幕:隔离性的最小演示(两个连接;手动版见 04-isolation-two-sessions.sql)');
{
  const a = await connect();
  const b = await connect();
  const bal = async (c) => (await c.query('SELECT balance FROM day36.accounts WHERE id = 1')).rows[0].balance;
  await a.query('UPDATE day36.accounts SET balance = 100 WHERE id = 1');
  await a.query('BEGIN');
  await a.query('UPDATE day36.accounts SET balance = balance - 30 WHERE id = 1');
  out(`  A:BEGIN; UPDATE … -30          A 自己看到 ${await bal(a)}`);
  out(`  B:SELECT(A 还没提交)          B 看到 ${await bal(b)}`);
  const bUpdate = b.query('UPDATE day36.accounts SET balance = balance + 1 WHERE id = 1'); // 会卡住
  await sleep(300);
  const waiting = (await a.query(
    "SELECT wait_event_type, wait_event, state FROM pg_stat_activity WHERE pid = $1",
    [b.processID],
  )).rows[0];
  out(`  B:UPDATE 同一行 → 卡住了:wait_event_type=${waiting.wait_event_type}, wait_event=${waiting.wait_event}, state=${waiting.state}`);
  await a.query('COMMIT');
  await bUpdate;
  out(`  A:COMMIT → B 的 UPDATE 立刻继续   B 再看 ${await bal(b)}(100 - 30 + 1)`);
  await a.query('UPDATE day36.accounts SET balance = 100 WHERE id = 1');
  await a.end();
  await b.end();
}

line('第 5 幕:持久性(05-durability.sql)');
runFile('05-durability.sql');
out('\n各跑 3 次(2000 次单行提交,一个 DO 块里每行 COMMIT 一次):');
const DO_2000 = 'DO $$ BEGIN FOR i IN 1..2000 LOOP INSERT INTO day36.commit_bench VALUES (i); COMMIT; END LOOP; END $$';
for (const mode of ['on', 'off']) {
  const times = [];
  for (let i = 0; i < 3; i++) {
    const r = run(['-c', 'CREATE TABLE IF NOT EXISTS day36.commit_bench (id int)', '-c', `SET synchronous_commit = ${mode}`, '-c', '\\timing on', '-c', DO_2000, '-c', 'DROP TABLE day36.commit_bench']);
    const m = r.stdout.match(/Time: ([\d.]+) ms/g);
    if (!m) fail('计时失败', r.stdout);
    times.push(Number(m.at(-2)?.match(/[\d.]+/)?.[0] ?? m[0].match(/[\d.]+/)[0]));
  }
  out(`  synchronous_commit = ${mode.padEnd(3)}  ${Math.min(...times).toFixed(1)} – ${Math.max(...times).toFixed(1)} ms(${times.map((t) => t.toFixed(1)).join(' / ')})`);
}

// ---------- 可选:真的崩溃一次 ----------
if (CRASH) {
  line('第 5½ 幕:真的崩溃一次(--crash)');
  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
  const local = ['localhost', '127.0.0.1', '::1'].includes(env.PGHOST);
  if (!isRoot || !local) {
    out('  跳过:需要在「本机安装的 PostgreSQL」上、以 root 运行(要能给 postgres 的进程发 SIGKILL)。');
    out('  Docker 里可以用 docker compose kill -s SIGKILL postgres && docker compose up -d 做同样的实验(未实测)。');
  } else {
    const waitUp = async () => {
      for (let i = 0; i < 60; i++) {
        try {
          const c = await connect();
          await c.query('SELECT 1');
          return c;
        } catch {
          await sleep(500);
        }
      }
      fail('PostgreSQL 30 秒内没有恢复', '  sudo service postgresql status;看 /var/log/postgresql/ 里的日志');
    };
    // ① 提交过的 vs 没提交的
    const s = await connect();
    await s.query('DROP TABLE IF EXISTS day36.crash_probe; CREATE TABLE day36.crash_probe (id int, note text)');
    await s.query("INSERT INTO day36.crash_probe VALUES (1, '提交过的')");
    const lsn = (await s.query('SELECT pg_current_wal_lsn() AS l')).rows[0].l;
    const victim = await connect();
    await victim.query('BEGIN');
    await victim.query("INSERT INTO day36.crash_probe VALUES (2, '没提交的')");
    out(`  已提交 1 行(提交后 WAL 位置 ${lsn});另一个连接 BEGIN 后插了 1 行、没提交`);
    out(`  kill -9 那个没提交的后端进程(pid ${victim.processID}):PostgreSQL 会断开所有连接、照着 WAL 做崩溃恢复`);
    process.kill(victim.processID, 'SIGKILL');
    await s.end().catch(() => {});
    await sleep(1000);
    const after = await waitUp();
    const rows = (await after.query('SELECT id, note FROM day36.crash_probe ORDER BY id')).rows;
    out(`  恢复之后表里:${JSON.stringify(rows)}`);
    await after.end().catch(() => {});
    // ② synchronous_commit off / on:崩溃时会不会丢「已经告诉客户端成功了」的提交(每一轮崩溃都会断开所有连接,所以每轮重新连)
    for (const mode of ['off', 'on']) {
      const prep = await waitUp();
      await prep.query('DROP TABLE IF EXISTS day36.sc_probe; CREATE TABLE day36.sc_probe (id int)');
      await prep.end();
      const c = await connect();
      await c.query(`SET synchronous_commit = ${mode}`);
      let acked = 0;
      const start = Date.now();
      try {
        for (let i = 1; ; i++) {
          await c.query('INSERT INTO day36.sc_probe VALUES ($1)', [i]);
          acked = i;
          if (Date.now() - start > 300) process.kill(c.processID, 'SIGKILL');
        }
      } catch {
        // 连接被杀掉,循环结束
      }
      await sleep(1000);
      const v = await waitUp();
      const n = (await v.query('SELECT count(*)::int AS n FROM day36.sc_probe')).rows[0].n;
      out(`  synchronous_commit = ${mode.padEnd(3)} 客户端收到「成功」的提交 ${acked} 次,恢复后表里 ${n} 行 → 丢了 ${acked - n} 行`);
      await v.end();
    }
    const st = spawnSync('service', ['postgresql', 'status'], { encoding: 'utf8' });
    out(`  service postgresql status:${(st.stdout || st.stderr).trim()}`);
  }
}

line('第 6 幕:autocommit、DDL 回滚、事务里的时间(06-ddl-autocommit-time.sql)');
runFile('06-ddl-autocommit-time.sql');

// ---------- 第 7 幕:应用里看到的 aborted ----------
line('第 7 幕:应用(pg 驱动)里看到的 aborted 状态');
{
  const c = await connect();
  await c.query('BEGIN');
  try {
    await c.query('UPDATE day36.accounts SET balance = balance - 1000 WHERE id = 1');
  } catch (e) {
    out(`  第 1 条出错:${e.code} ${e.message}`);
  }
  try {
    await c.query('SELECT 1');
  } catch (e) {
    out(`  同一个事务里接着 SELECT 1:${e.code} ${e.message}`);
  }
  const r = await c.query('COMMIT');
  out(`  这时发 COMMIT,驱动拿到的命令标签是:${r.command}(不是 COMMIT)`);
  out(`  事务结束之后再 SELECT 1:${(await c.query('SELECT 1 AS ok')).rows[0].ok}`);
  await c.end();
}

// ---------- 第 8 幕:nest-lab 的 transaction() 修复 ----------
line('第 8 幕:nest-lab 的 transaction():事务进行到一半,连接被杀掉');
{
  const reset = spawnSync(process.execPath, ['scripts/db-reset.mjs', '--schema', 'day36_app'], { cwd: ROOT, env: { ...process.env, DATABASE_URL: URL_ }, encoding: 'utf8' });
  if (reset.status !== 0) fail('建 schema day36_app 失败', reset.stdout + reset.stderr);
  const { PgTasksRepository } = await import(new URL('../dist/tasks/pg-tasks.repository.js', import.meta.url).href);
  const killer = await connect();

  // 一个「会在 INSERT INTO tasks 之前,先把自己这个连接杀掉」的连接池
  const makePool = () => {
    const pool = new pg.Pool({ connectionString: URL_, max: 2, options: '-c search_path=day36_app' });
    pool.on('error', () => {});
    let armed = true;
    // 'connect' 事件:池子每新建一个连接触发一次。给它的 query 包一层:第一次执行 INSERT INTO tasks 时,
    // 另一个连接(killer)先锁住 tasks 表让 INSERT 卡在服务器里,再把执行 INSERT 的那个后端杀掉 ——
    // 这样 INSERT 拿到的是服务器发来的「连接被管理员终止」,接下来的 ROLLBACK 拿到的是另一个错误(连接已经不能用)
    pool.on('connect', (client) => {
      client.on('error', () => {});
      const q = client.query.bind(client);
      client.query = (text, ...rest) => {
        if (armed && typeof text === 'string' && text.startsWith('INSERT INTO tasks')) {
          armed = false;
          return (async () => {
            await killer.query('BEGIN');
            await killer.query('LOCK TABLE day36_app.tasks IN SHARE MODE');
            const running = q(text, ...rest);
            running.catch(() => {});
            await sleep(200);
            await killer.query('SELECT pg_terminate_backend($1)', [client.processID]);
            await killer.query('ROLLBACK');
            return running;
          })();
        }
        return q(text, ...rest);
      };
    });
    return pool;
  };

  // 修复前的写法(照抄 Day 27 的 transaction(),只为对比)
  const oldTransaction = async (pool, work) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch {
      await client.query('ROLLBACK');
      throw new Error('(不会走到这里)');
    } finally {
      client.release();
    }
  };

  const oldPool = makePool();
  try {
    await oldTransaction(oldPool, (c) => c.query("INSERT INTO tasks (title) VALUES ('修复前') RETURNING id"));
  } catch (e) {
    out(`  修复前:调用方收到的错误 → ${e.message}`);
  }
  const oldNext = await oldPool.query('SELECT count(*)::int AS n FROM tasks');
  out(`  修复前:下一个请求照样成功(表里 ${oldNext.rows[0].n} 行);pg-pool 自己丢掉了「已经不能再查询」的连接`);
  await oldPool.end();

  const newPool = makePool();
  const repo = new PgTasksRepository(newPool);
  try {
    await repo.insert({ title: '修复后', done: false, checklist: [], createdAt: new Date().toISOString() });
  } catch (e) {
    out(`  修复后:调用方收到的错误 → ${e.code ?? ''} ${e.message}`);
  }
  const created = await repo.insert({ title: '下一个请求', done: false, checklist: [{ text: '步骤 1', done: false }], createdAt: new Date().toISOString() });
  out(`  修复后:下一个请求成功(新任务 id ${created.id},清单 ${created.checklist.length} 项)`);
  await newPool.end();
  await killer.end();
  run(['-c', 'DROP SCHEMA day36_app CASCADE']);
}

out(`\n观察结束(用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒):表留在 schema day36 里,可以 psql 连进去 SET search_path = day36; 继续玩`);
