// Day 41 观察脚本:连接池深入与 PgBouncer。
//   第 1–3 幕:直连 PostgreSQL —— 一个连接一个进程有多贵、6 个副本 × 每池 20 个连接撞上 max_connections、并发连接数和吞吐的关系
//   第 4–6 幕:经过 PgBouncer —— transaction / session / statement 三种模式、transaction 模式下会话级状态的坑、预备语句
//   第 7 幕:超时三件套,以及它们能设在哪里(角色级 / 库级的设置做完立刻恢复)
//   第 8 幕:nest-lab 的真实代码(dist)经过 PgBouncer 运行
//
// 跑:npm run day41   # 先 nest build,本机约 30 秒
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;另外需要 pgbouncer 命令(1.21+;没有就跳过第 4–6、8 幕)。
// PgBouncer 由本脚本启动(监听 127.0.0.1:6432,配置来自 pgbouncer/pgbouncer.ini),结束时一定停掉 —— 出错退出也会停。
// 用 root 运行时 PgBouncer 会拒绝启动,脚本自动加 -u nobody。
// 表都在独立的 schema day41 里,每次运行都会先删掉重建;不碰 app 和 app_test。
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  PGAPPNAME: 'day41',
};
const DIRECT = `postgresql://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`;
const BOUNCER_PORT = 6432;
const viaBouncer = (db) => `postgresql://${env.PGUSER}:${env.PGPASSWORD}@127.0.0.1:${BOUNCER_PORT}/${db}`;
const write = (s) => process.stdout.write(s);
const out = (...a) => write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);
const fail = (title, hint) => {
  out(`\n❌ ${title}\n${hint}`);
  process.exit(1);
};
const PSQL = 'psql -w -X "$@" 2>&1';
const run = (args) => spawnSync('sh', ['-c', PSQL, 'sh', ...args], { cwd: ROOT, env, encoding: 'utf8', timeout: 60_000 });
const runFile = (f) => {
  const r = run(['-f', `sql/day41/${f}`]);
  if (r.status !== 0 || /ERROR/.test(r.stdout)) fail(`${f} 执行失败`, r.stdout);
  out(
    r.stdout
      .split('\n')
      .filter((l) => !/^(SET|BEGIN|COMMIT|CREATE TABLE|INSERT 0 \d+)$/.test(l))
      .join('\n')
      .trimEnd(),
  );
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ms = (t) => `${(performance.now() - t).toFixed(0)} ms`;
const errText = (e) => `${e.severity ?? 'ERROR'} ${e.code ?? ''} ${e.message}`.replace(/\s+/g, ' ');
const t0 = Date.now();
console.log = () => {}; // nest-lab 的 ctxLog 会往 console.log 打日志;脚本自己的输出走 process.stdout

// ---------- 第 0 幕:数据库、dist、PgBouncer ----------
line('第 0 幕:检查数据库,启动 PgBouncer');
const probe = spawnSync('psql', ['-w', '-X', '-At', '-c', 'SELECT version()'], { env, encoding: 'utf8', timeout: 10_000 });
if (probe.error) fail('找不到 psql 命令', '  安装方法见 Day 22 讲义「先跑起来」;或者用 docker compose exec postgres psql …');
if (probe.status !== 0) {
  fail(
    `连不上 ${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`,
    `  psql 说:${probe.stderr.trim()}\n  · Docker:docker compose up -d,等 docker compose ps 显示 healthy\n  · 本机安装:确认服务已启动、.env 里的 POSTGRES_* 与建库时一致(见 Day 22 讲义)`,
  );
}
out(`服务器:${probe.stdout.trim().split(' on ')[0]}`);
const dist = (p) => new URL(`../dist/${p}`, import.meta.url).href;
let mods;
try {
  mods = {
    ...(await import(dist('database/pg-pool.js'))),
    ...(await import(dist('tasks/pg-tasks.repository.js'))),
    ...(await import(dist('tasks/tasks.service.js'))),
    ...(await import(dist('database/with-retry.js'))),
  };
} catch (err) {
  fail('读不到 dist/ 里的编译结果', `  请用 npm run day41 运行(它会先 nest build)。\n  ${err.message}`);
}
const { createPool, PgTasksRepository, TasksService, withRetry } = mods;
const { default: pg } = await import('pg');

// ---- PgBouncer:生成一份临时配置(日志、pid 放进临时目录,auth_file 用绝对路径),前台子进程运行 ----
let bouncer = null;
let bouncerDir = null;
const stopBouncer = () => {
  if (bouncer && bouncer.exitCode === null) bouncer.kill('SIGTERM');
};
process.on('exit', () => {
  // 任何方式退出(包括 fail() 和未捕获的异常)都会走到这里:PgBouncer 一定被停掉,临时目录删掉
  if (bouncer && bouncer.exitCode === null) bouncer.kill('SIGKILL');
  if (bouncerDir) rmSync(bouncerDir, { recursive: true, force: true });
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));
process.on('uncaughtException', (err) => {
  out(`\n❌ 未预期的错误:${err.stack ?? err}`);
  process.exit(1);
});

const which = spawnSync('sh', ['-c', 'command -v pgbouncer'], { encoding: 'utf8' });
let bouncerOk = false;
if (which.status !== 0) {
  out('⚠️ 找不到 pgbouncer 命令:跳过第 4–6、8 幕。安装:apt install pgbouncer / brew install pgbouncer;Docker 写法见讲义');
} else {
  bouncerDir = mkdtempSync(join(tmpdir(), 'day41-pgbouncer-'));
  chmodSync(bouncerDir, 0o777); // root 运行时 PgBouncer 以 nobody 身份写日志和 pid
  const ini = readFileSync(`${ROOT}pgbouncer/pgbouncer.ini`, 'utf8')
    .replace(/^logfile = .*$/m, `logfile = ${bouncerDir}/pgbouncer.log`)
    .replace(/^pidfile = .*$/m, `pidfile = ${bouncerDir}/pgbouncer.pid`)
    .replace(/^auth_file = .*$/m, `auth_file = ${ROOT}pgbouncer/userlist.txt`);
  const iniPath = join(bouncerDir, 'pgbouncer.ini');
  writeFileSync(iniPath, ini, { mode: 0o644 });
  const asRoot = process.getuid?.() === 0;
  bouncer = spawn('pgbouncer', [...(asRoot ? ['-u', 'nobody'] : []), iniPath], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  bouncer.stderr.on('data', (d) => (stderr += d));
  bouncer.on('error', () => {});
  for (let i = 0; i < 50 && bouncer.exitCode === null; i++) {
    const c = new pg.Client({ connectionString: viaBouncer('pgbouncer') });
    c.on('error', () => {});
    try {
      await c.connect();
      await c.end();
      bouncerOk = true;
      break;
    } catch {
      await sleep(100);
    }
  }
  const version = spawnSync('pgbouncer', ['--version'], { encoding: 'utf8' }).stdout.split('\n')[0];
  if (bouncerOk) out(`PgBouncer:${version},监听 127.0.0.1:${BOUNCER_PORT}(pid ${bouncer.pid}${asRoot ? ',以 nobody 运行' : ''})`);
  else {
    let log = '';
    try {
      log = readFileSync(join(bouncerDir, 'pgbouncer.log'), 'utf8');
    } catch {
      // 没有日志
    }
    out(`⚠️ PgBouncer 没有启动成功:跳过第 4–6、8 幕。\n  ${(stderr + log).trim().split('\n').slice(-5).join('\n  ')}`);
    out(`  常见原因:6432 端口被占用(lsof -i :6432)、配置文件有误、版本低于 1.21`);
    stopBouncer();
  }
}
const admin = async (sql) => {
  const c = new pg.Client({ connectionString: viaBouncer('pgbouncer') });
  c.on('error', () => {});
  await c.connect();
  try {
    return (await c.query(sql)).rows;
  } finally {
    await c.end();
  }
};
const pools = async (db) => (await admin('SHOW POOLS')).find((r) => r.database === db);
const poolText = (p) => `cl_active ${p.cl_active}, cl_waiting ${p.cl_waiting}, sv_active ${p.sv_active}, sv_idle ${p.sv_idle}`;

// nest_lab_tiny(只有 2 个服务端连接)上的客户端,第 5–7 幕用
const client = async (name) => {
  const c = new pg.Client({ connectionString: viaBouncer('nest_lab_tiny'), application_name: name });
  c.on('error', () => {});
  c.notices = [];
  c.on('notice', (n) => c.notices.push(`${n.severity} ${n.message}`));
  await c.connect();
  return c;
};
const one = async (c, sql) => (await c.query(sql)).rows[0];
const freshTiny = async () => {
  // 断开这个库的全部服务端连接,让它们干干净净地重新开始
  await admin('KILL nest_lab_tiny');
  await admin('RESUME nest_lab_tiny');
};
const warm = async (a, b) => {
  // 先让两个服务端连接都建起来
  await a.query('BEGIN');
  await b.query('BEGIN');
  await one(a, 'SELECT 1');
  await one(b, 'SELECT 1');
  await a.query('COMMIT');
  await b.query('COMMIT');
};

const monitor = new pg.Client({ connectionString: DIRECT, application_name: 'day41-monitor' });
monitor.on('error', () => {});
await monitor.connect();
const backends = async (where = '') =>
  Number(
    (
      await monitor.query(
        `SELECT count(*) AS n FROM pg_stat_activity WHERE backend_type = 'client backend' AND pid <> pg_backend_pid() ${where}`,
      )
    ).rows[0].n,
  );

// 准备 schema day41:nest-lab 的表结构 + 一张演示表
const reset = spawnSync(process.execPath, ['scripts/db-reset.mjs', '--schema', 'day41'], {
  cwd: ROOT,
  env: { ...process.env, DATABASE_URL: DIRECT },
  encoding: 'utf8',
});
if (reset.status !== 0) fail('建 schema day41 失败', reset.stdout + reset.stderr);
line('准备数据(db-reset --schema day41 + 01-setup.sql)');
runFile('01-setup.sql');

// ---------- 第 1 幕:一个连接一个进程 ----------
line('第 1 幕:为什么连接贵 —— 每个连接都是 PostgreSQL 里的一个进程');
{
  const N = 40;
  let t = performance.now();
  const clients = [];
  for (let i = 0; i < N; i++) {
    const c = new pg.Client({ connectionString: DIRECT, application_name: 'day41-cost' });
    c.on('error', () => {});
    await c.connect();
    clients.push(c);
  }
  const openMs = performance.now() - t;
  const pids = await Promise.all(clients.map(async (c) => (await c.query('SELECT pg_backend_pid() AS pid')).rows[0].pid));
  const ps = spawnSync('ps', ['-o', 'pid=,rss=,comm=', '-p', pids.join(',')], { encoding: 'utf8' });
  const rows = ps.stdout.trim().split('\n').filter(Boolean).map((l) => l.trim().split(/\s+/));
  const rss = rows.map((r) => Number(r[1]));
  out(`  依次打开 ${N} 个连接:${openMs.toFixed(0)} ms(平均每个 ${(openMs / N).toFixed(1)} ms,含 SCRAM 认证);ps 看到 ${rows.length} 个进程,命令名 ${rows[0]?.[2]}`);
  if (rss.length) out(`  每个空闲后端进程的常驻内存(RSS)约 ${(Math.min(...rss) / 1024).toFixed(1)}–${(Math.max(...rss) / 1024).toFixed(1)} MB(RSS 会把碰过的共享内存也算进去,真实的独占部分更小)`);
  await Promise.all(clients.map((c) => c.end()));

  // 每次查询都新建连接 vs 用池
  const Q = 200;
  t = performance.now();
  for (let i = 0; i < Q; i++) {
    const c = new pg.Client({ connectionString: DIRECT });
    await c.connect();
    await c.query('SELECT 1');
    await c.end();
  }
  const fresh = performance.now() - t;
  const pool = new pg.Pool({ connectionString: DIRECT, max: 5 });
  await pool.query('SELECT 1');
  t = performance.now();
  for (let i = 0; i < Q; i++) await pool.query('SELECT 1');
  const pooled = performance.now() - t;
  await pool.end();
  out(`  ${Q} 次 SELECT 1,一个接一个:每次新建连接 ${fresh.toFixed(0)} ms(平均 ${(fresh / Q).toFixed(2)} ms)vs 连接池复用 ${pooled.toFixed(0)} ms(平均 ${(pooled / Q).toFixed(2)} ms)`);
  out('  → Day 27 的连接池解决的就是这个:伙计请好了一直留着,不要每来一位客人就招一个、办完就辞退');
}

// ---------- 第 2 幕:6 个副本 × 每池 20 ----------
line('第 2 幕:6 个副本 × 每池 20 个连接 = 120 > max_connections');
const settings = (await monitor.query(`SELECT current_setting('max_connections') AS max, current_setting('superuser_reserved_connections') AS su`)).rows[0];
const occupy = async (connect, replicas, perPool, sql) => {
  const ps = Array.from({ length: replicas }, (_, i) => {
    const p = new pg.Pool({ connectionString: connect, max: perPool, application_name: `replica-${i + 1}`, connectionTimeoutMillis: 10_000 });
    p.on('error', () => {});
    return p;
  });
  const results = await Promise.all(
    ps.flatMap((p) =>
      Array.from({ length: perPool }, () =>
        p.query(sql).then(
          () => 'ok',
          (e) => e,
        ),
      ),
    ),
  );
  return { ps, results };
};
{
  const before = await backends();
  out(`  max_connections = ${settings.max}(其中 ${settings.su} 个留给超级用户),实验前已有 ${before + 1} 个客户端连接(含脚本自己的监控连接)`);
  const t = performance.now();
  const { ps, results } = await occupy(DIRECT, 6, 20, 'SELECT pg_sleep(0.5)');
  const ok = results.filter((r) => r === 'ok').length;
  const errs = results.filter((r) => r !== 'ok');
  const kinds = new Map();
  for (const e of errs) kinds.set(errText(e), (kinds.get(errText(e)) ?? 0) + 1);
  out(`  6 个连接池同时各发 20 条 SELECT pg_sleep(0.5)(${ms(t)}):成功 ${ok},失败 ${errs.length}`);
  for (const [k, v] of kinds) out(`      ${k} × ${v}`);
  out('  → 每个副本自己的池都「合理」,加起来超了;超出的那部分请求直接失败(而不是排队)');
  await Promise.all(ps.map((p) => p.end()));
}

// ---------- 第 3 幕:并发连接数 vs 吞吐 ----------
line('第 3 幕:同一批 1200 条查询,分别用 2 / 5 / 20 / 80 个并发连接直连 PostgreSQL');
{
  const cpus = (await import('node:os')).availableParallelism();
  out(`  本机 ${cpus} 个 CPU 核心;每条查询是 SELECT count(*) FROM generate_series(1, 50000)(约 1–2 ms 的纯 CPU 活)`);
  const TOTAL = 1200;
  for (const n of [2, 5, 20, 80]) {
    const pool = new pg.Pool({ connectionString: DIRECT, max: n });
    await Promise.all(Array.from({ length: n }, () => pool.query('SELECT 1'))); // 先把连接都建好,不把建连接的时间算进去
    const lat = [];
    let next = 0;
    const t = performance.now();
    await Promise.all(
      Array.from({ length: n }, async () => {
        while (next++ < TOTAL) {
          const s = performance.now();
          await pool.query('SELECT count(*) FROM generate_series(1, 50000)');
          lat.push(performance.now() - s);
        }
      }),
    );
    const el = performance.now() - t;
    lat.sort((a, b) => a - b);
    const p = (q) => lat[Math.min(lat.length - 1, Math.floor(lat.length * q))].toFixed(1);
    out(`  ${String(n).padStart(2)} 个连接:${String((TOTAL / el) * 1000 | 0).padStart(4)} 条/秒,单条延迟 p50 ${p(0.5).padStart(5)} ms,p99 ${p(0.99).padStart(5)} ms`);
    await pool.end();
  }
  out('  → CPU 核心就这么几个:连接数超过核心数之后,吞吐不再上升,每条查询只是排更久的队(还要多付进程内存和切换的钱)');
}

// ---------- 第 4 幕:PgBouncer 的三种模式 ----------
if (bouncerOk) {
  line('第 4 幕:同样的 6 × 20 = 120 个客户端连接,改连 PgBouncer(transaction 模式,default_pool_size = 20)');
  {
    const t = performance.now();
    // 每 100 ms 采样一次,记下「服务端连接最多的那一刻」
    let sample = null;
    let running = true;
    const sampler = (async () => {
      while (running) {
        const s = { pool: await pools('nest_lab'), pg: await backends(`AND client_addr = '127.0.0.1' AND application_name LIKE 'replica-%'`) };
        if (!sample || s.pool.sv_active > sample.pool.sv_active) sample = s;
        await sleep(100);
      }
    })();
    const { ps, results } = await occupy(viaBouncer('nest_lab'), 6, 20, 'SELECT pg_sleep(0.05)');
    // 每个客户端连接再各发 4 条,模拟持续的请求
    const more = await Promise.all(ps.flatMap((p) => Array.from({ length: 80 }, () => p.query('SELECT pg_sleep(0.02)').then(() => 'ok', (e) => e))));
    running = false;
    await sampler;
    const all = [...results, ...more];
    const errs = all.filter((r) => r !== 'ok');
    out(`  120 个客户端连接、${all.length} 条查询:成功 ${all.length - errs.length},失败 ${errs.length},用时 ${ms(t)}`);
    out(`  服务端连接最多的那一刻 —— PgBouncer SHOW POOLS:${poolText(sample.pool)}`);
    out(`                     PostgreSQL 里来自 PgBouncer 的后端进程:${sample.pg} 个`);
    await Promise.all(ps.map((p) => p.end()));
    const st = (await admin('SHOW STATS')).find((r) => r.database === 'nest_lab');
    out(`  SHOW STATS(nest_lab,启动以来):事务 ${st.total_xact_count},查询 ${st.total_query_count},120 个客户端排队等服务端连接的时间合计 ${(Number(st.total_wait_time) / 1000).toFixed(0)} ms`);
    out('  → 客户端可以有几百个,真正进账房的始终是 20 位伙计;多出来的客人在门口排队(cl_waiting),不会被 too many clients 拒绝');
  }

  out('\n  —— session 模式(nest_lab_session):一个客户端从连上到断开一直占着一个服务端连接 ——');
  {
    const clients = Array.from({ length: 120 }, () => {
      const c = new pg.Client({ connectionString: viaBouncer('nest_lab_session') });
      c.on('error', () => {});
      return c;
    });
    await Promise.all(clients.map((c) => c.connect()));
    const queries = clients.map((c) => c.query('SELECT pg_sleep(0.02)').then(() => 'ok', () => 'cut'));
    await sleep(800);
    const p = await pools('nest_lab_session');
    const done = (await Promise.all(queries.map((q) => Promise.race([q, sleep(0).then(() => 'pending')])))).filter((r) => r === 'ok').length;
    out(`  120 个客户端各发一条 20 ms 的查询,800 ms 后:完成 ${done} 条;SHOW POOLS:${poolText(p)}`);
    out('  → 前 20 个客户端查完了也不放手(会话还开着),后面 100 个只能一直等:session 模式几乎不省连接');
    await Promise.all(clients.map((c) => c.end().catch(() => {})));
    await Promise.all(queries);
  }

  out('\n  —— statement 模式(nest_lab_statement):每条语句结束就还连接,事务根本开不了 ——');
  {
    const c = new pg.Client({ connectionString: viaBouncer('nest_lab_statement') });
    c.on('error', () => {});
    await c.connect();
    const r = await c.query('BEGIN').then(() => c.query('SELECT 1')).then(() => 'ok', (e) => e);
    out(`  BEGIN; SELECT 1 → ${r === 'ok' ? '成功(?)' : errText(r)}`);
    await c.end().catch(() => {});
  }

  // ---------- 第 5 幕:transaction 模式的坑 ----------
  line('第 5 幕:transaction 模式下,会话级状态会「消失」,也会「串到别人那里」(nest_lab_tiny:只有 2 个服务端连接)');
  {
    await freshTiny();
    const a = await client('A');
    const b = await client('B');
    await warm(a, b);
    out('  ① SET 不带 LOCAL');
    await a.query("SET statement_timeout = '100ms'");
    const a1 = await one(a, "SELECT pg_backend_pid() AS pid, current_setting('statement_timeout') AS v");
    out(`    A:SET statement_timeout = '100ms';然后查 → 服务端连接 pid ${a1.pid},statement_timeout = ${a1.v}`);
    await b.query('BEGIN');
    const b1 = await one(b, "SELECT pg_backend_pid() AS pid, current_setting('statement_timeout') AS v");
    out(`    B:BEGIN; 查 → pid ${b1.pid},statement_timeout = ${b1.v}${b1.v === '100ms' ? '  ← A 设的值串到了 B 这里' : ''}`);
    const a2 = await one(a, "SELECT pg_backend_pid() AS pid, current_setting('statement_timeout') AS v");
    out(`    A:再查 → pid ${a2.pid},statement_timeout = ${a2.v}${a2.v !== '100ms' ? '  ← A 自己设的值「消失」了(换了一个服务端连接)' : ''}`);
    await b.query('COMMIT');
    await a.end();
    await b.end();
    await freshTiny();

    out('  修法:SET LOCAL,只在事务里生效');
    const c = await client('C');
    const d = await client('D');
    await warm(c, d);
    await c.query('BEGIN');
    await c.query("SET LOCAL statement_timeout = '100ms'");
    const c1 = await one(c, "SELECT pg_backend_pid() AS pid, current_setting('statement_timeout') AS v");
    const slow = await c.query('SELECT pg_sleep(0.3)').then(() => 'ok', (e) => e);
    await c.query('ROLLBACK');
    out(`    C:BEGIN; SET LOCAL statement_timeout = '100ms' → pid ${c1.pid},${c1.v};SELECT pg_sleep(0.3) → ${slow === 'ok' ? 'ok' : errText(slow)};ROLLBACK`);
    await d.query('BEGIN');
    const d1 = await one(d, "SELECT pg_backend_pid() AS pid, current_setting('statement_timeout') AS v");
    await d.query('COMMIT');
    out(`    D:BEGIN; 查 → pid ${d1.pid},statement_timeout = ${d1.v}${d1.pid === c1.pid ? '(同一个服务端连接,但设置已随事务结束撤销)' : ''}`);
    await c.end();
    await d.end();
    await freshTiny();
  }
  {
    out('  ② 会话级咨询锁 pg_advisory_lock(Day 39 的「值班牌」)');
    const a = await client('A');
    const b = await client('B');
    await warm(a, b);
    const r1 = await one(a, 'SELECT pg_advisory_lock(41) AS ok, pg_backend_pid() AS pid');
    out(`    A:SELECT pg_advisory_lock(41) → 拿到了,锁记在服务端连接 pid ${r1.pid} 上`);
    await b.query('BEGIN');
    const r2 = await one(b, 'SELECT pg_try_advisory_lock(41) AS ok, pg_backend_pid() AS pid');
    out(`    B:BEGIN; SELECT pg_try_advisory_lock(41) → ${r2.ok}(pid ${r2.pid})${r2.ok && r2.pid === r1.pid ? '  ← B「继承」了 A 的锁:咨询锁对同一个会话可重入,而 B 正好分到了那个会话' : ''}`);
    const r3 = await one(a, 'SELECT pg_advisory_unlock(41) AS ok, pg_backend_pid() AS pid');
    out(`    A:SELECT pg_advisory_unlock(41) → ${r3.ok}(pid ${r3.pid})${a.notices.length ? `,${a.notices.join(';')}` : ''}`);
    await b.query('COMMIT');
    const held = (await monitor.query("SELECT pid, count(*) AS n FROM pg_locks WHERE locktype = 'advisory' AND objid = 41 AND granted GROUP BY pid")).rows;
    out(`    B COMMIT 之后,直连 PostgreSQL 查 pg_locks:咨询锁 41 仍然被 pid ${held.map((h) => `${h.pid}`).join(', ') || '(无)'} 持有 —— 没有任何客户端「拿着」它,但它泄漏在池里的服务端连接上`);
    await a.end();
    await b.end();
    await freshTiny();
    const c = await client('C');
    await c.query('BEGIN');
    await one(c, 'SELECT pg_advisory_xact_lock(41)');
    const during = Number((await monitor.query("SELECT count(*) AS n FROM pg_locks WHERE locktype = 'advisory' AND objid = 41")).rows[0].n);
    await c.query('COMMIT');
    const after = Number((await monitor.query("SELECT count(*) AS n FROM pg_locks WHERE locktype = 'advisory' AND objid = 41")).rows[0].n);
    out(`  修法:BEGIN; SELECT pg_advisory_xact_lock(41); … COMMIT → 事务中 pg_locks 里 ${during} 个,COMMIT 后 ${after} 个(随事务自动释放)`);
    await c.end();
    await freshTiny();
  }
  {
    out('  ③ 临时表(另一种会话级状态)');
    const a = await client('A');
    const b = await client('B');
    await warm(a, b);
    await a.query('CREATE TEMP TABLE scratch (x int)');
    const pa = await one(a, 'SELECT pg_backend_pid() AS pid');
    await b.query('BEGIN');
    await one(b, 'SELECT 1');
    const r = await a.query('SELECT count(*) FROM scratch').then(() => 'ok', (e) => e);
    out(`    A:CREATE TEMP TABLE scratch(在 pid ${pa.pid} 上);B 开着事务时 A 再查 scratch → ${r === 'ok' ? '查到了(这次分到了同一个连接)' : errText(r)}`);
    await b.query('COMMIT');
    await a.end();
    await b.end();
    await freshTiny();
  }

  // ---------- 第 6 幕:预备语句 ----------
  line('第 6 幕:具名预备语句 —— max_prepared_statements = 0(1.22 的默认)vs 100');
  const named = { name: 'add_one', text: 'SELECT $1::int + 1 AS r', values: [1] };
  const unnamed = { text: 'SELECT $1::int + 1 AS r', values: [1] };
  for (const setting of [0, 100]) {
    await admin(`SET max_prepared_statements = ${setting}`);
    await freshTiny();
    const a = await client('A');
    const b = await client('B');
    await warm(a, b);
    const r1 = await a.query(named).then((r) => `ok(r = ${r.rows[0].r})`, (e) => errText(e));
    const pidA = (await one(a, 'SELECT pg_backend_pid() AS pid')).pid;
    await b.query('BEGIN');
    const pidB = (await one(b, 'SELECT pg_backend_pid() AS pid')).pid;
    const r2 = await a.query(named).then((r) => `ok(r = ${r.rows[0].r})`, (e) => errText(e));
    const c = await client('C');
    await b.query('COMMIT');
    const r3 = await c.query(named).then((r) => `ok(r = ${r.rows[0].r})`, (e) => errText(e));
    const r4 = await a.query(unnamed).then((r) => `ok(r = ${r.rows[0].r})`, (e) => errText(e));
    out(`  max_prepared_statements = ${setting}:`);
    out(`    A 第 1 次执行具名语句 add_one(在 pid ${pidA} 上 Parse + Execute)→ ${r1}`);
    out(`    B 开着事务占住 pid ${pidB};A 第 2 次执行(pg 驱动记得「这个连接上准备过了」,只发 Bind + Execute,但 PgBouncer 把它送到了另一个服务端连接)→ ${r2}`);
    out(`    新客户端 C 第 1 次执行同名语句(分到的服务端连接上已经有 A 留下的 add_one)→ ${r3}`);
    out(`    不具名的参数化查询(nest-lab 的写法)→ ${r4}`);
    await Promise.all([a.end(), b.end(), c.end()]);
  }
  await admin('SET max_prepared_statements = 0');
  await freshTiny();
  out('  → 开了 max_prepared_statements,PgBouncer 替每个客户端记住它准备过的语句,换了服务端连接就自己补一次 Parse。');
  out('    nest-lab 只用不具名的参数化查询(Day 27),每次都按真实参数生成计划(Day 32 的「定制计划」),开不开都兼容');
}

// ---------- 第 7 幕:超时三件套 ----------
line('第 7 幕:超时三件套,以及它们能设在哪里');
{
  const c = new pg.Client({ connectionString: DIRECT, options: '-c search_path=day41' });
  c.on('error', () => {});
  await c.connect();
  await c.query('BEGIN');
  await c.query("SET LOCAL statement_timeout = '200ms'");
  let t = performance.now();
  const r1 = await c.query('SELECT pg_sleep(1)').then(() => 'ok', (e) => e);
  await c.query('ROLLBACK');
  out(`  statement_timeout = 200ms,SELECT pg_sleep(1) → ${errText(r1)},${ms(t)}`);

  const holder = new pg.Client({ connectionString: DIRECT, options: '-c search_path=day41' });
  holder.on('error', () => {});
  await holder.connect();
  await holder.query('BEGIN');
  await holder.query('SELECT * FROM accounts WHERE id = 1 FOR UPDATE');
  await c.query('BEGIN');
  await c.query("SET LOCAL lock_timeout = '300ms'");
  t = performance.now();
  const r2 = await c.query('UPDATE accounts SET balance = balance - 1 WHERE id = 1').then(() => 'ok', (e) => e);
  await c.query('ROLLBACK');
  await holder.query('ROLLBACK');
  await holder.end();
  out(`  lock_timeout = 300ms,另一个连接锁着这一行,UPDATE → ${errText(r2)},${ms(t)}`);
  await c.end();

  // idle_in_transaction_session_timeout + nest-lab 的 Pool 之后怎么恢复
  const pool = new pg.Pool({ connectionString: DIRECT, max: 2, options: '-c idle_in_transaction_session_timeout=500ms' });
  pool.on('error', () => {}); // 空闲连接被服务器断开时,池子会发 error 事件;不监听的话进程会崩
  for (const how of ['release(err)', 'release()']) {
    const client = await pool.connect();
    const events = [];
    client.on('error', (e) => events.push(errText(e)));
    const pid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    await client.query('BEGIN');
    await client.query('SELECT 1');
    t = performance.now();
    await sleep(800); // 「事务开着,去调了一个很慢的外部接口」
    const r = await client.query('SELECT 1').then(() => 'ok', (e) => e);
    out(`  idle_in_transaction_session_timeout = 500ms:BEGIN 之后发呆 800 ms,再发 SELECT 1 →`);
    out(`      连接上收到的错误事件:${events[0] ?? '(无)'}`);
    out(`      SELECT 1 本身:${r === 'ok' ? 'ok' : errText(r)}`);
    if (how === 'release(err)') client.release(r === 'ok' ? undefined : r);
    else client.release();
    const total = pool.totalCount;
    const next = (await pool.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    out(`      ${how} 之后:池里剩 ${total} 个连接;下一个 pool.query 用的是 pid ${next}(原来是 ${pid})→ ${next !== pid ? '换了一个新连接,恢复正常' : '还是原来那个?!'}`);
  }
  await pool.end();
  out('  → 被服务器断开的连接 pg-pool 3.x 两种写法都会丢掉(它不能再查询了);Day 36 的 release(err) 管的是「看起来还活着、但状态不可信」的连接');

  // 能设在哪里、谁覆盖谁(做完立刻恢复)
  out('\n  能设在哪里(后面的覆盖前面的),设置做完马上 RESET:');
  const show = async (connect, extra) => {
    const x = new pg.Client({ connectionString: connect, ...extra });
    x.on('error', () => {});
    await x.connect();
    const row = (await x.query("SELECT setting, source FROM pg_settings WHERE name = 'statement_timeout'")).rows[0];
    let local;
    await x.query('BEGIN');
    await x.query("SET LOCAL statement_timeout = '200ms'");
    local = (await x.query("SELECT setting, source FROM pg_settings WHERE name = 'statement_timeout'")).rows[0];
    await x.query('COMMIT');
    await x.end();
    return { row, local };
  };
  try {
    await monitor.query(`ALTER DATABASE ${env.PGDATABASE} SET statement_timeout = '30s'`);
    let s = await show(DIRECT);
    out(`    ALTER DATABASE … SET statement_timeout = '30s'               → 新连接看到 ${s.row.setting} ms(source = ${s.row.source})`);
    await monitor.query(`ALTER ROLE ${env.PGUSER} IN DATABASE ${env.PGDATABASE} SET statement_timeout = '5s'`);
    s = await show(DIRECT);
    out(`    再 ALTER ROLE … IN DATABASE … SET statement_timeout = '5s'   → 新连接看到 ${s.row.setting} ms(source = ${s.row.source})`);
    s = await show(DIRECT, { options: '-c statement_timeout=1s' });
    out(`    再加连接参数 options=-c statement_timeout=1s                  → ${s.row.setting} ms(source = ${s.row.source})`);
    out(`    再在事务里 SET LOCAL statement_timeout = '200ms'               → ${s.local.setting} ms(source = ${s.local.source}),COMMIT 后撤销`);
    if (bouncerOk) {
      await freshTiny(); // 让 PgBouncer 新开服务端连接:角色 / 库上的设置只在新连接建立时生效
      s = await show(viaBouncer('nest_lab_tiny'));
      out(`    经过 PgBouncer(新的服务端连接)                              → ${s.row.setting} ms(source = ${s.row.source}):角色级设置对 PgBouncer 同样有效`);
    }
  } finally {
    await monitor.query(`ALTER ROLE ${env.PGUSER} IN DATABASE ${env.PGDATABASE} RESET statement_timeout`);
    await monitor.query(`ALTER DATABASE ${env.PGDATABASE} RESET statement_timeout`);
    if (bouncerOk) await freshTiny();
  }
  const left = (await monitor.query('SELECT count(*) AS n FROM pg_db_role_setting')).rows[0].n;
  out(`    已恢复:pg_db_role_setting 里还剩 ${left} 条设置`);
  out('\n  04-timeouts.sql(恢复之后再看一遍,source 应该都是 default):');
  runFile('04-timeouts.sql');
}

// ---------- 第 8 幕:nest-lab 经过 PgBouncer ----------
if (bouncerOk) {
  line('第 8 幕:nest-lab 的真实代码(dist)经过 PgBouncer');
  const tryInit = async (settings) => {
    const pool = createPool(settings);
    pool.on('error', () => {});
    const repo = new PgTasksRepository(pool, null, settings.schema);
    const r = await repo.onModuleInit().then(() => 'ok', (e) => e);
    return { pool, repo, r };
  };
  {
    const { pool, r } = await tryInit({ connectionString: viaBouncer('nest_lab_day41'), schema: 'day41', max: 5 });
    out(`  ① 照原样(启动参数 options=-c search_path=day41)连 6432 → ${r === 'ok' ? '启动成功' : errText(r)}`);
    await pool.end();
  }
  {
    await admin("SET ignore_startup_parameters = 'options'");
    const { pool, r } = await tryInit({ connectionString: viaBouncer('nest_lab'), schema: 'day41', max: 5 });
    const where = (await pool.query('SELECT current_schema() AS s')).rows[0].s;
    out(`  ② 让 PgBouncer 忽略 options(ignore_startup_parameters = options):连接成功了,但 current_schema() = ${where}`);
    out(`     search_path 被悄悄丢掉:不加检查的话,nest-lab 会去读写 ${where}.tasks。Day 41 加的启动检查 → ${r === 'ok' ? '启动成功(?)' : r.message.split(':')[0]}`);
    await pool.end();
    await admin("SET ignore_startup_parameters = ''");
  }
  {
    const { pool, repo, r } = await tryInit({ connectionString: viaBouncer('nest_lab_day41'), schema: 'day41', max: 10, searchPathAtStartup: false });
    out(`  ③ DB_STARTUP_SEARCH_PATH=false + 库别名 nest_lab_day41(connect_query 设 search_path)→ ${r === 'ok' ? '启动成功,current_schema() = day41' : errText(r)}`);
    if (r === 'ok') {
      const service = new TasksService(repo, { now: () => new Date() });
      const create = (title) => repo.insert({ title, done: false, checklist: [], createdAt: new Date().toISOString() });
      // Day 40 第 3 幕的场景:「标成已完成」和「改标题」几乎同时到达
      let bad = 0;
      let rejected = 0;
      for (let i = 0; i < 10; i++) {
        const t = await create('原标题');
        const finishing = service.update(t.id, { done: true });
        const rename = await service.update(t.id, { title: '偷偷改名' }).then((x) => x, (e) => e);
        await finishing;
        if (rename?.problemType) rejected++;
        else if (rename.done) bad++;
      }
      out(`     Day 40 的竞态(完成 + 改名,10 次):违规 ${bad},改名被 409 拒绝 ${rejected},其余是「先改名后完成」`);
      // 悲观锁:FOR NO KEY UPDATE 在事务里,事务结束才还连接 —— transaction 模式下天然成立
      const counter = await create('计数 0');
      const tt = performance.now();
      await Promise.all(Array.from({ length: 30 }, () => repo.updateLocked(counter.id, (cur) => ({ title: `计数 ${Number(cur.title.split(' ')[1]) + 1}` }))));
      const after = await repo.findById(counter.id);
      out(`     悲观锁 updateLocked × 30 并发:${after.title}、version ${after.version}(${ms(tt)})`);
      // 乐观锁 + withRetry
      class Stale extends Error {}
      const c2 = await create('计数 0');
      await Promise.all(
        Array.from({ length: 30 }, () =>
          withRetry(
            async () => {
              const cur = await repo.findById(c2.id);
              const res = await repo.update(c2.id, { title: `计数 ${Number(cur.title.split(' ')[1]) + 1}` }, cur.version);
              if (res.status === 'stale') throw new Stale();
            },
            { isRetryable: (e) => e instanceof Stale, maxAttempts: 100, baseDelayMs: 2, maxDelayMs: 50 },
          ),
        ),
      );
      out(`     乐观锁 + withRetry × 30 并发:${(await repo.findById(c2.id)).title}`);
      out(`     PgBouncer SHOW POOLS(nest_lab_day41):${poolText(await pools('nest_lab_day41'))}`);
    }
    await pool.end();
  }
  out('  完整的 e2e:npm run test:e2e:pgbouncer(需要先另开一个终端运行 PgBouncer,见讲义)');
}

// ---------- 收尾:停掉 PgBouncer,确认没有遗留进程 ----------
await monitor.end();
if (bouncer) {
  line('收尾:停止 PgBouncer');
  stopBouncer();
  for (let i = 0; i < 50 && bouncer.exitCode === null && bouncer.signalCode === null; i++) await sleep(100);
  const leftover = spawnSync('sh', ['-c', `ps -eo pid,args | grep '[p]gbouncer ' | grep '${bouncerDir}' || true`], { encoding: 'utf8' }).stdout.trim();
  out(`  PgBouncer 已退出(${bouncer.signalCode ?? `exit ${bouncer.exitCode}`});本脚本启动的 pgbouncer 进程还剩:${leftover || '0 个'}`);
}
out(`\n全部完成,用时 ${((Date.now() - t0) / 1000).toFixed(1)} 秒。schema day41 留着,可以用 psql 进去看(下次运行会重建)。`);
