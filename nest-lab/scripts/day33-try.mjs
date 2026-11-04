// Day 33 观察脚本:GIN 与 BRIN —— B-tree 与 LIKE、pg_trgm 三元组、全文搜索、JSONB / 数组、GIN 的写入代价、BRIN 与数据顺序。
//
// 跑:npm run day33
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// 01-setup.sql 会 CREATE EXTENSION pg_trgm / btree_gin(受信任的扩展,数据库 owner 就能建;不行时见讲义)。
// 所有表都在独立的 schema day33 里,每次运行都会先把 day33 整个删掉重建(100 万任务,本机约 5 秒)。
// 每个实验文件自己建索引、最后删掉;计时部分由本脚本临时建索引、测 3 次、再删掉。整个脚本本机约 3 分钟。
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
  PGAPPNAME: 'day33',
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
  const r = run(['-f', `sql/day33/${f}`]);
  out(r.stdout.trimEnd());
  if (r.status !== 0) fail(`${f} 执行失败`, '  看上面 psql 的输出');
  return r.stdout;
};
// 跑 n 次 EXPLAIN (ANALYZE),取每次的 Execution Time(数据库内部的执行时间,不含网络和打印)
const execTimes = (sql, n = 3, settings = '') => {
  const script = Array.from({ length: n }, () => `${settings} EXPLAIN (ANALYZE, TIMING OFF) ${sql};`).join('\n');
  const r = run(['-c', `SET search_path = day33, public; SET max_parallel_workers_per_gather = 0; ${script}`]);
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

// 临时执行几条建索引的语句 → 每个查询测 3 次 → 删掉索引(drops 是要删的索引名)
const bench = (creates, drops, cases) => {
  for (const sql of creates) {
    const r = run(['-c', `SET search_path = day33, public; ${sql}`]);
    if (r.status !== 0 || /ERROR/.test(r.stdout)) fail(`执行失败:${sql}`, r.stdout);
  }
  run(['-c', 'ANALYZE day33.tasks']);
  for (const [label, sql, settings = ''] of cases) out(`  ${label.padEnd(40)}${fmt(execTimes(sql, 3, settings))}`);
  if (drops.length) run(['-c', `SET search_path = day33, public; DROP INDEX ${drops.join(', ')};`]);
};
const session = (...cmds) => run(['-c', 'SET search_path = day33, public', '-c', 'SET client_min_messages = warning', ...cmds.flatMap((c) => ['-c', c])]);
// 每个 EXPLAIN 只取最上面那个节点(Insert)的 WAL
const wal = (s) =>
  s.split('QUERY PLAN').slice(1).map((block) => block.match(/WAL: records=\d+(?: fpi=\d+)? bytes=(\d+)/)).filter(Boolean).map((m) => Number(m[1]));
const ms = (s) => [...s.matchAll(/Execution Time: ([\d.]+) ms/g)].map((m) => Number(m[1]));
const mb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;
const range = (xs, f) => (Math.min(...xs) === Math.max(...xs) ? f(xs[0]) : `${f(Math.min(...xs))} – ${f(Math.max(...xs))}`);

// ---------- 第 1 幕:造数据 ----------
line('第 1 幕:准备数据(01-setup.sql)');
out('正在建扩展、造 100 万任务,请稍等……');
const setup = runFile('01-setup.sql');
if (/ERROR/.test(setup)) fail('01-setup.sql 里有语句失败', '  多半是建扩展没有权限:见讲义「先跑起来」里用超级用户 CREATE EXTENSION 的做法');

line('第 2 幕:B-tree 与 LIKE(02-btree-like.sql)');
runFile('02-btree-like.sql');
out('\n各跑 3 次:');
const PREFIX = "SELECT id, title FROM tasks WHERE title LIKE 'Fix invoice%'";
bench([], [], [["没有索引 · ILIKE '%urgent%'", "SELECT id, title FROM tasks WHERE title ILIKE '%urgent%'"]]);
bench(['CREATE INDEX b_plain ON tasks (title)'], ['b_plain'], [["普通 B-tree · LIKE 'Fix invoice%'", PREFIX]]);
bench(['CREATE INDEX b_pat ON tasks (title text_pattern_ops)'], ['b_pat'], [["text_pattern_ops · LIKE 'Fix invoice%'", PREFIX]]);

line('第 3 幕:pg_trgm + GIN(03-trgm.sql)');
runFile('03-trgm.sql');
const TRGM_CASES = [
  ["ILIKE '%urgent%'(约 1000 行)", "SELECT id, title FROM tasks WHERE title ILIKE '%urgent%'"],
  ["ILIKE '%invoice%'(约 5 万行)", "SELECT id, title FROM tasks WHERE title ILIKE '%invoice%'"],
  ["LIKE '%发票导出%'(约 5 万行)", "SELECT id, title FROM tasks WHERE title LIKE '%发票导出%'"],
  ["LIKE '%(加急)%'(约 1000 行)", "SELECT id, title FROM tasks WHERE title LIKE '%(加急)%'"],
  ["LIKE '%加急%'(2 个字)", "SELECT id, title FROM tasks WHERE title LIKE '%加急%'"],
];
out('\n各跑 3 次 · 没有索引:');
bench([], [], TRGM_CASES);
out('各跑 3 次 · trigram GIN:');
bench(['CREATE INDEX b_trgm ON tasks USING gin (title gin_trgm_ops)'], [], TRGM_CASES);

out('\nnest-lab 的 ?q= 用 pg 驱动发 title ILIKE $1 ESCAPE \'\\\'(参数是 %关键字%),数据库拿到的计划:');
{
  const { default: pg } = await import('pg');
  const client = new pg.Client({ host: env.PGHOST, port: Number(env.PGPORT), user: env.PGUSER, password: env.PGPASSWORD, database: env.PGDATABASE });
  await client.connect();
  for (const q of ['%urgent%', '%加急%']) {
    const r = await client.query(`EXPLAIN (COSTS OFF) SELECT id, title FROM day33.tasks WHERE title ILIKE $1 ESCAPE '\\'`, [q]);
    out(`  参数 ${q}:`);
    out(r.rows.map((x) => '    ' + x['QUERY PLAN']).join('\n'));
  }
  await client.end();
}
run(['-c', 'DROP INDEX day33.b_trgm']);

line('第 4 幕:全文搜索(04-fts.sql)');
runFile('04-fts.sql');
const FTS_Q = "SELECT id, title FROM tasks WHERE to_tsvector('english', title) @@ websearch_to_tsquery('english', 'deploying invoices')";
out('\n各跑 3 次(搜 deploying invoices,约 5000 行):');
bench([], [], [['没有索引(每行现算 to_tsvector)', FTS_Q]]);
bench(["CREATE INDEX b_fts ON tasks USING gin (to_tsvector('english', title))"], ['b_fts'], [['GIN (to_tsvector(english, title))', FTS_Q]]);

line('第 5 幕:JSONB 与数组的 GIN(05-jsonb-array.sql)');
runFile('05-jsonb-array.sql');
const TAG_Q = "SELECT id FROM tasks WHERE tags @> ARRAY['security']";
const DUE_Q = "SELECT count(*) FROM tasks WHERE meta ? 'due'";
const API_Q = 'SELECT count(*) FROM tasks WHERE meta @> \'{"source": "api", "priority": "high"}\'';
out('\n各跑 3 次 · 没有索引:');
bench([], [], [["tags @> {security}(约 3000 行)", TAG_Q], ["meta ? 'due'(约 1 万行)", DUE_Q], ['meta @> {api, high}(约 8 万行)', API_Q]]);
out('各跑 3 次 · 有 GIN:');
bench(['CREATE INDEX b_tags ON tasks USING gin (tags)'], ['b_tags'], [['GIN (tags)', TAG_Q]]);
bench(['CREATE INDEX b_meta ON tasks USING gin (meta)'], ['b_meta'], [["GIN (meta) jsonb_ops · ? 'due'", DUE_Q], ['GIN (meta) jsonb_ops · @> {api, high}', API_Q]]);
bench(['CREATE INDEX b_mpath ON tasks USING gin (meta jsonb_path_ops)'], ['b_mpath'], [['GIN (meta jsonb_path_ops) · @>', API_Q]]);

line('第 6 幕:GIN 的写入代价(06-gin-cost.sql)');
runFile('06-gin-cost.sql');
out('\n各跑 3 次(每次新建表 g → 建索引 → 插入 10 万个标题;EXPLAIN (ANALYZE, WAL) 计时和数 WAL):');
for (const [label, idx] of [
  ['没有索引', ''],
  ['B-tree (title)', 'CREATE INDEX ON g (title)'],
  ['trigram GIN · fastupdate on', 'CREATE INDEX ON g USING gin (title gin_trgm_ops)'],
  ['trigram GIN · fastupdate off', 'CREATE INDEX ON g USING gin (title gin_trgm_ops) WITH (fastupdate = off)'],
]) {
  const times = [], wals = [];
  for (let i = 0; i < 3; i++) {
    const r = session(
      'DROP TABLE IF EXISTS g',
      'CREATE TABLE g (title text NOT NULL) WITH (autovacuum_enabled = false)',
      ...(idx ? [idx] : []),
      'EXPLAIN (ANALYZE, WAL, TIMING OFF) INSERT INTO g SELECT title FROM tasks WHERE id <= 100000',
      'DROP TABLE g',
    );
    const [t] = ms(r.stdout);
    const [w] = wal(r.stdout);
    if (t === undefined || w === undefined) fail('GIN 写入实验失败', r.stdout);
    times.push(t), wals.push(w);
  }
  out(`  ${label.padEnd(30)}${fmt(times)}  WAL ${range(wals, mb)}`);
}

line('第 7 幕:BRIN(07-brin.sql)');
runFile('07-brin.sql');
const DAY_Q = (t) => `SELECT count(*), max(title) FROM ${t} WHERE created_at >= '2025-06-01 00:00+00' AND created_at < '2025-06-02 00:00+00'`;
out('\n各跑 3 次(查某一天,1440 行):');
bench(['CREATE INDEX b_btree ON tasks (created_at)'], ['b_btree'], [['按时间顺序的表 · B-tree', DAY_Q('tasks')]]);
bench(['CREATE INDEX b_brin ON tasks USING brin (created_at)'], ['b_brin'], [['按时间顺序的表 · BRIN', DAY_Q('tasks')]]);
{
  const r = session('SELECT setseed(0.33)', 'CREATE TABLE tasks_shuffled AS SELECT id, title, created_at FROM tasks ORDER BY random()', 'CREATE INDEX ON tasks_shuffled USING brin (created_at)', 'VACUUM ANALYZE tasks_shuffled');
  if (/ERROR/.test(r.stdout)) fail('建打乱的表失败', r.stdout);
  out(`  ${'打乱的表 · 优化器选全表扫描'.padEnd(40)}${fmt(execTimes(DAY_Q('tasks_shuffled')))}`);
  out(`  ${'打乱的表 · 强行用 BRIN'.padEnd(40)}${fmt(execTimes(DAY_Q('tasks_shuffled'), 3, 'SET enable_seqscan = off;'))}`);
  session('DROP TABLE tasks_shuffled');
}

out('\n观察结束:表留在 schema day33 里(实验用的索引都已删掉),可以 psql 连进去 SET search_path = day33, public; 继续玩');
