// Day 38 观察脚本:MVCC 与 VACUUM —— 行版本(xmin / xmax / ctid)、pageinspect、快照与可见性(两个连接)、
// 读不阻塞写、表膨胀与 VACUUM / VACUUM FULL、autovacuum 自己出现、长事务挡住清理、冻结。
//
// 跑:npm run day38   # 本机约 30–55 秒(最后要等 autovacuum 自己来,最多等到第 50 秒左右)
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// 表都在独立的 schema day38 里,每次运行都会先删掉重建;autovacuum 的参数只设在 day38 的表上,不改全局配置。
// pageinspect 要超级用户:以 root 运行时用 sudo -u postgres 执行那一段;否则跳过,并给出手动命令。
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
  PGAPPNAME: 'day38',
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
const runFile = (f, { show = true, filter } = {}) => {
  const r = run(['-f', `sql/day38/${f}`]);
  if (r.status !== 0 || /ERROR/.test(r.stdout)) fail(`${f} 执行失败`, r.stdout);
  const text = filter ? r.stdout.split('\n').filter(filter).join('\n') : r.stdout;
  if (show) out(text.trimEnd());
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
const connect = async () => {
  const c = new pg.Client({ connectionString: URL_, options: '-c search_path=day38' });
  c.on('error', () => {});
  await c.connect();
  return c;
};
const one = async (c, sql, params) => (await c.query(sql, params)).rows[0];

line('第 1 幕:准备数据(01-setup.sql),并先在 av_demo 上制造死元组(06-autovacuum.sql),让 autovacuum 的「闹钟」先走起来');
runFile('01-setup.sql');
const avStart = Date.now();
runFile('06-autovacuum.sql');

line('第 2 幕:行版本 —— xmin / xmax / ctid(02-versions.sql)');
runFile('02-versions.sql');

line('第 3 幕:用 pageinspect 看数据页(03-pageinspect.sql,要超级用户)');
{
  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
  const local = ['localhost', '127.0.0.1', '::1'].includes(env.PGHOST);
  if (isRoot && local) {
    out('  以 root 运行:用 sudo -u postgres 执行这一段');
    const r = spawnSync('su', ['postgres', '-c', `psql -X -d ${env.PGDATABASE} -f ${ROOT}sql/day38/03-pageinspect.sql`], { encoding: 'utf8', timeout: 30_000 });
    out((r.stdout + r.stderr).split('\n').filter((l) => !/^(SET|CREATE EXTENSION)$/.test(l)).join('\n').trimEnd());
  } else {
    out('  跳过:get_raw_page / heap_page_items 只有超级用户能用。手动执行:');
    out('    sudo -u postgres psql -d nest_lab -f sql/day38/03-pageinspect.sql');
    out('  不用超级用户也能看到一部分:上一幕的 xmin / xmax / ctid 就是当前可见版本的这几列;看不见的版本(死元组)只能靠 pageinspect,或看 pg_stat_user_tables.n_dead_tup 的计数');
  }
}

// ---------- 第 4 幕:快照与可见性,两个连接 ----------
line('第 4 幕:快照与可见性 —— 同一行的两个版本,被两个事务各看各的(04-snapshot.sql 里有手动步骤)');
runFile('04-snapshot.sql');
{
  const a = await connect();
  const b = await connect();
  await a.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  const snapA = await one(a, 'SELECT pg_current_snapshot()::text AS snap, v FROM items WHERE id = 1');
  out(`  A:BEGIN REPEATABLE READ;读 id=1 → v = ${snapA.v},A 的快照 = ${snapA.snap}`);
  let t = performance.now();
  await b.query('BEGIN');
  await b.query('UPDATE items SET v = v + 100 WHERE id = 1');
  const bx = await one(b, 'SELECT pg_current_xact_id()::text AS x');
  await b.query('COMMIT');
  out(`  B:UPDATE id=1(v + 100)并提交,用了 ${(performance.now() - t).toFixed(1)} ms —— 没有等 A(读不阻塞写),B 的事务号 = ${bx.x}`);
  const va = await one(a, 'SELECT ctid::text, xmin::text, xmax::text, v FROM items WHERE id = 1');
  const vb = await one(b, 'SELECT ctid::text, xmin::text, xmax::text, v FROM items WHERE id = 1');
  out(`  A 看到:ctid ${va.ctid}  xmin ${va.xmin}  xmax ${va.xmax}  v = ${va.v}   ← 旧版本(它的 xmax 是 B,但 B 不在 A 的快照里)`);
  out(`  B 看到:ctid ${vb.ctid}  xmin ${vb.xmin}  xmax ${vb.xmax}  v = ${vb.v}   ← 新版本`);
  const vis = await one(a, 'SELECT pg_visible_in_snapshot($1::xid8, pg_current_snapshot()) AS v', [bx.x]);
  out(`  在 A 的快照里,B 的事务号 ${bx.x} 算「已经提交」吗?pg_visible_in_snapshot → ${vis.v}`);
  await a.query('COMMIT');

  // 写不阻塞读:B 开着一个没提交的 UPDATE,A(READ COMMITTED)直接读
  await b.query('BEGIN');
  await b.query('UPDATE items SET v = -1 WHERE id = 1');
  t = performance.now();
  const r = await one(a, 'SELECT v FROM items WHERE id = 1');
  out(`  B:BEGIN; UPDATE id=1 SET v = -1(没提交)→ A 立刻读到 v = ${r.v},用了 ${(performance.now() - t).toFixed(1)} ms —— 写不阻塞读`);
  await b.query('ROLLBACK');
  await a.end();
  await b.end();
}

line('第 5 幕:表膨胀、VACUUM 与 VACUUM FULL(05-bloat-vacuum.sql)');
runFile('05-bloat-vacuum.sql');

// ---------- 第 6 幕:长事务 ----------
line('第 6 幕:长事务挡住清理(07-long-transaction.sql 是会话 B 那一侧)');
const verbose = (s) => s.split('\n').filter((l) => /===|tuples:|removable cutoff|idle in transaction|^\s+pid|^-+\+/.test(l)).join('\n');
for (const [label, begin, firstStmt] of [
  ['A:READ COMMITTED,只 SELECT 过,然后挂着(idle in transaction)', 'BEGIN', 'SELECT count(*) FROM longtx'],
  ['A:REPEATABLE READ,只 SELECT 过,然后挂着', 'BEGIN ISOLATION LEVEL REPEATABLE READ', 'SELECT count(*) FROM longtx'],
  // 写的是另一张表的一行:只要写过,事务就有了事务号;写 longtx 的话,B 的 UPDATE 会卡在 A 锁住的那一行上(Day 39 的行锁)
  ['A:READ COMMITTED,写过(另一张表的)一行,然后挂着', 'BEGIN', 'UPDATE items SET v = v WHERE id = 2'],
]) {
  out(`\n  ── ${label} ──`);
  const a = await connect();
  await a.query(begin);
  await a.query(firstStmt);
  out(verbose(runFile('07-long-transaction.sql', { show: false })));
  await a.query('COMMIT');
  await a.end();
  const again = run(['-c', 'VACUUM (VERBOSE) day38.longtx']).stdout;
  out(`  A COMMIT 之后再 VACUUM (VERBOSE):\n${verbose(again)}`);
}

line('第 7 幕:冻结与事务号回卷(08-freeze.sql)');
runFile('08-freeze.sql');

// ---------- 第 8 幕:autovacuum ----------
line('第 8 幕:autovacuum 自己来了吗?(av_demo:阈值 50,第 1 幕制造了 1000 个死元组)');
{
  const budgetEnd = t0 + 52_000;
  let row;
  for (;;) {
    row = run(['-At', '-F', '|', '-c', "SELECT n_dead_tup, coalesce(last_autovacuum::text, ''), autovacuum_count FROM pg_stat_user_tables WHERE relid = 'day38.av_demo'::regclass"]).stdout.trim().split('|');
    if (Number(row[2]) > 0 || Date.now() > budgetEnd) break;
    await sleep(2000);
  }
  const waited = ((Date.now() - avStart) / 1000).toFixed(0);
  if (Number(row[2]) > 0) {
    out(`  来了:制造死元组之后约 ${waited} 秒内,autovacuum 清理了 av_demo(last_autovacuum = ${row[1]},现在死元组 ${row[0]})`);
  } else {
    out(`  等了 ${waited} 秒还没来(死元组 ${row[0]})。launcher 每 autovacuum_naptime(默认 60 秒)才看一次这个库,`);
    out("  过一会儿再查:SELECT n_dead_tup, last_autovacuum FROM pg_stat_user_tables WHERE relid = 'day38.av_demo'::regclass;");
  }
}

out(`\n观察结束(用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒):表留在 schema day38 里,可以 psql 连进去 SET search_path = day38; 继续玩`);
