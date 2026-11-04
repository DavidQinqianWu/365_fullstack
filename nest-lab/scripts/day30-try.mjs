// Day 30 观察脚本:读执行计划 —— 计划树、BUFFERS、扫描节点、排序与 work_mem、三种 JOIN、统计信息过期。
//
// 跑:npm run day30
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// 所有表都在独立的 schema day30 里(不依赖 Day 29 的表),每次运行都会先把 day30 整个删掉重建(造 100 万行,本机约 3 秒,慢的机器可能几十秒)。
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
  PGAPPNAME: 'day30',
};
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);
const fail = (title, hint) => {
  out(`\n❌ ${title}\n${hint}`);
  process.exit(1);
};
const PSQL = 'psql -w -X "$@" 2>&1';
const run = (args) => spawnSync('sh', ['-c', PSQL, 'sh', ...args], { cwd: ROOT, env, encoding: 'utf8', timeout: 600_000 });
const runFile = (f) => {
  const r = run(['-f', `sql/day30/${f}`]);
  out(r.stdout.trimEnd());
  if (r.status !== 0) fail(`${f} 执行失败`, '  看上面 psql 的输出');
  return r.stdout;
};
// 跑 n 次 EXPLAIN (ANALYZE),取每次的 Execution Time(数据库内部的执行时间,不含网络和打印)
const execTimes = (sql, n = 3, settings = '') => {
  const script = Array.from({ length: n }, () => `${settings} EXPLAIN (ANALYZE, TIMING OFF) ${sql};`).join('\n');
  const r = run(['-c', `SET search_path = day30; SET max_parallel_workers_per_gather = 0; ${script}`]);
  return [...r.stdout.matchAll(/Execution Time: ([\d.]+) ms/g)].map((m) => Number(m[1]));
};
const fmt = (ts) => `${Math.min(...ts).toFixed(3)} – ${Math.max(...ts).toFixed(3)} ms(${ts.map((t) => t.toFixed(3)).join(' / ')})`;

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

// ---------- 第 1 幕:造数据 ----------
line('第 1 幕:准备数据(01-setup.sql)');
out('正在造 100 万行任务 + 1 万个用户,请稍等……');
runFile('01-setup.sql');

line('第 2 幕:读一棵计划树(02-read-plan.sql)');
runFile('02-read-plan.sql');

line('第 3 幕:BUFFERS —— shared hit vs read(03-buffers.sql)');
runFile('03-buffers.sql');

line('第 4 幕:扫描节点(04-node-types.sql)');
runFile('04-node-types.sql');

line('第 5 幕:排序与 LIMIT(05-sort-limit.sql)');
runFile('05-sort-limit.sql');
const SORT = 'SELECT * FROM tasks ORDER BY title';
out('\n各跑 3 次:');
out(`  work_mem = 4MB(默认,溢出到磁盘)  ${fmt(execTimes(SORT))}`);
out(`  work_mem = 256MB(全在内存)        ${fmt(execTimes(SORT, 3, "SET work_mem = '256MB';"))}`);

line('第 6 幕:三种 JOIN(06-joins.sql)');
runFile('06-joins.sql');
const NL = 'SELECT u.name, t.title FROM users u JOIN tasks t ON t.owner_id = u.id WHERE u.id IN (5000, 5001)';
const HJ = 'SELECT u.plan, count(*) FROM tasks t JOIN users u ON u.id = t.owner_id GROUP BY u.plan';
out('\n各跑 3 次:');
out(`  2 个用户的任务:优化器选的 Nested Loop     ${fmt(execTimes(NL))}`);
out(`  2 个用户的任务:不许 Nested Loop(→ Hash)  ${fmt(execTimes(NL, 3, 'SET enable_nestloop = off;'))}`);
out(`  全部任务按套餐统计:Hash Join(1 批)        ${fmt(execTimes(HJ))}`);
out(`  同上,work_mem = 64kB(分 8 批)             ${fmt(execTimes(HJ, 3, "SET work_mem = '64kB';"))}`);
out(`  同上,不许 Hash Join(→ Merge Join)        ${fmt(execTimes(HJ, 3, 'SET enable_hashjoin = off;'))}`);

line('第 7 幕:统计信息过期(07a-stale-setup.sql → 07b-stale-stats.sql)');
runFile('07a-stale-setup.sql');
const STALE = 'SELECT u.plan, count(*) FROM imports i JOIN users u ON u.id = i.owner_id WHERE i.owner_id = 42 GROUP BY u.plan';
const staleTimes = execTimes(STALE);
runFile('07b-stale-stats.sql');
out('\n各跑 3 次:');
out(`  统计过期(以为 42 号只有 1 行)  ${fmt(staleTimes)}`);
out(`  ANALYZE 之后                     ${fmt(execTimes(STALE))}`);

line('第 8 幕:EXPLAIN ANALYZE 会真的执行(08-analyze-executes.sql)');
runFile('08-analyze-executes.sql');

out('\n观察结束:表都留在 schema day30 里,可以 psql 连进去 SET search_path = day30; 继续玩');
