// Day 31 观察脚本:复合索引与覆盖索引 —— 最左前缀、列顺序、复合 vs 两个单列、WHERE + ORDER BY + LIMIT、keyset 分页、INCLUDE 与 visibility map。
//
// 跑:npm run day31
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// 所有表都在独立的 schema day31 里(不依赖 Day 29 / 30 的表),每次运行都会先把 day31 整个删掉重建(造 100 万行,本机约 3 秒,慢的机器可能几十秒)。
// 每个实验文件自己建索引、最后删掉;计时部分由本脚本临时建索引、测 3 次、再删掉。
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
  PGAPPNAME: 'day31',
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
  const r = run(['-f', `sql/day31/${f}`]);
  out(r.stdout.trimEnd());
  if (r.status !== 0) fail(`${f} 执行失败`, '  看上面 psql 的输出');
  return r.stdout;
};
// 跑 n 次 EXPLAIN (ANALYZE),取每次的 Execution Time(数据库内部的执行时间,不含网络和打印)
const execTimes = (sql, n = 3, settings = '') => {
  const script = Array.from({ length: n }, () => `${settings} EXPLAIN (ANALYZE, TIMING OFF) ${sql};`).join('\n');
  const r = run(['-c', `SET search_path = day31; SET max_parallel_workers_per_gather = 0; ${script}`]);
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

// 临时建几个索引 → 每个查询测 3 次 → 删掉索引
const bench = (indexes, cases) => {
  const names = indexes.map(([name, def]) => {
    const r = run(['-c', `SET search_path = day31; CREATE INDEX ${name} ON tasks ${def};`]);
    if (r.status !== 0 || /ERROR/.test(r.stdout)) fail(`建索引 ${name} 失败`, r.stdout);
    return name;
  });
  for (const [label, sql, settings = ''] of cases) out(`  ${label.padEnd(34)}${fmt(execTimes(sql, 3, settings))}`);
  if (names.length) run(['-c', `SET search_path = day31; ${names.map((n) => `DROP INDEX ${n};`).join(' ')}`]);
};

// ---------- 第 1 幕:造数据 ----------
line('第 1 幕:准备数据(01-setup.sql)');
out('正在造 100 万行任务,请稍等……');
runFile('01-setup.sql');

line('第 2 幕:最左前缀(02-leftmost-prefix.sql)');
runFile('02-leftmost-prefix.sql');
out('\n各跑 3 次,索引 (owner_id, created_at):');
bench(
  [['b_oc', '(owner_id, created_at)']],
  [
    ['owner_id = 5000', 'SELECT * FROM tasks WHERE owner_id = 5000'],
    ['只有 created_at(优化器选全表扫描)', "SELECT * FROM tasks WHERE created_at >= '2025-06-01' AND created_at < '2025-06-02'"],
    ['只有 created_at(强行用这个索引)', "SELECT * FROM tasks WHERE created_at >= '2025-06-01' AND created_at < '2025-06-02'", 'SET enable_seqscan = off;'],
  ],
);

line('第 3 幕:列的顺序(03-column-order.sql)');
runFile('03-column-order.sql');
const ORDER_Q = "SELECT * FROM tasks WHERE owner_id = 1 AND created_at >= '2025-06-01' AND created_at < '2025-07-01'";
out('\n各跑 3 次:');
bench([['b_oc', '(owner_id, created_at)']], [['(owner_id, created_at)', ORDER_Q]]);
bench([['b_co', '(created_at, owner_id)']], [['(created_at, owner_id)', ORDER_Q]]);

line('第 4 幕:一个复合索引 vs 两个单列索引(04-composite-vs-two.sql)');
runFile('04-composite-vs-two.sql');
const AND_Q = 'SELECT * FROM tasks WHERE owner_id = 2 AND NOT done';
out('\n各跑 3 次:');
bench([['b_o', '(owner_id)'], ['b_d', '(done)']], [['两个单列索引(BitmapAnd)', AND_Q]]);
bench([['b_od', '(owner_id, done)']], [['复合索引 (owner_id, done)', AND_Q]]);

line('第 5 幕:WHERE + ORDER BY + LIMIT(05-where-order-limit.sql)');
runFile('05-where-order-limit.sql');
const LATEST = 'SELECT * FROM tasks WHERE owner_id = 2 ORDER BY created_at DESC, id DESC LIMIT 20';
out('\n各跑 3 次:');
bench([['b_o', '(owner_id)']], [['只有 (owner_id):取全部再排序', LATEST]]);
bench([['b_ocid', '(owner_id, created_at DESC, id DESC)']], [['(owner_id, created_at DESC, id DESC)', LATEST]]);

line('第 6 幕:keyset 分页(06-keyset.sql)');
runFile('06-keyset.sql');
out('\n各跑 3 次(书签停在很后面的位置):');
bench(
  [['b_cid', '(created_at, id)']],
  [['A 同方向 · 行值比较', "SELECT * FROM tasks WHERE (created_at, id) < ('2024-01-10 00:00+00', 12960) ORDER BY created_at DESC, id DESC LIMIT 21"]],
);
bench(
  [['b_cdia', '(created_at DESC, id ASC)']],
  [
    ['B1 混合方向 · 只有 OR', "SELECT * FROM tasks WHERE created_at < '2024-01-10 00:00+00' OR (created_at = '2024-01-10 00:00+00' AND id > 12960) ORDER BY created_at DESC, id ASC LIMIT 21"],
    ['B2 混合方向 · OR + 冗余范围条件', "SELECT * FROM tasks WHERE created_at <= '2024-01-10 00:00+00' AND (created_at < '2024-01-10 00:00+00' OR (created_at = '2024-01-10 00:00+00' AND id > 12960)) ORDER BY created_at DESC, id ASC LIMIT 21"],
  ],
);

line('第 7 幕:覆盖索引与 visibility map(07-covering.sql)');
runFile('07-covering.sql');
out('\n各跑 3 次(count 2 号用户的未完成任务,覆盖索引):');
const COUNT_Q = 'SELECT count(*) FROM tasks WHERE owner_id = 2 AND NOT done';
// 注意:psql 把一个 -c 里的多条语句放在同一个事务里,而 VACUUM 不能在事务里执行,所以分开写
run(['-c', 'CREATE INDEX b_cov ON day31.tasks (owner_id, created_at DESC, id DESC) INCLUDE (title, done)', '-c', 'VACUUM day31.tasks']);
out(`  VACUUM 之后(Heap Fetches 为 0)    ${fmt(execTimes(COUNT_Q))}`);
run(['-c', 'SET search_path = day31; UPDATE tasks SET title = title WHERE owner_id = 2;']);
out(`  UPDATE 之后、VACUUM 之前            ${fmt(execTimes(COUNT_Q))}`);
run(['-c', 'VACUUM day31.tasks', '-c', 'DROP INDEX day31.b_cov']);

out('\n观察结束:表留在 schema day31 里(实验用的索引都已删掉),可以 psql 连进去 SET search_path = day31; 继续玩');
