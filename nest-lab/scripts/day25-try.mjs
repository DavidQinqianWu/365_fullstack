// Day 25 观察脚本:JOIN 全家、半连接 / 反连接、扇出、聚合、子查询与 CTE、NULL 的三值逻辑。
//
// 跑:npm run day25
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// 所有表都建在独立的 schema day25 里(Day 24 的 3NF 表 + 补充数据);每次运行都会先把 day25 整个删掉重建。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
try {
  process.loadEnvFile(`${ROOT}.env`);
} catch {
  // 没有 .env 就用默认值
}
const conn = {
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: process.env.POSTGRES_PORT ?? '5432',
  user: process.env.POSTGRES_USER ?? 'nest_lab',
  password: process.env.POSTGRES_PASSWORD ?? 'nest_lab_dev',
  db: process.env.POSTGRES_DB ?? 'nest_lab',
};
const env = {
  ...process.env,
  PGHOST: conn.host,
  PGPORT: conn.port,
  PGUSER: conn.user,
  PGPASSWORD: conn.password,
  PGDATABASE: conn.db,
  PGCONNECT_TIMEOUT: '3',
  PGAPPNAME: 'day25',
};
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);
const fail = (title, hint) => {
  out(`\n❌ ${title}\n${hint}`);
  process.exit(1);
};
// -w 永不提示密码、-X 不读 ~/.psqlrc;2>&1 让 NOTICE / ERROR 按真实顺序夹在结果中间
const run = (args) =>
  spawnSync('sh', ['-c', 'psql -w -X "$@" 2>&1', 'sh', ...args], { cwd: ROOT, env, encoding: 'utf8', timeout: 15000 });

// ---------- 第 0 幕:数据库在不在 ----------
line('第 0 幕:检查数据库');
const probe = spawnSync('psql', ['-w', '-X', '-At', '-c', 'SELECT version()'], { env, encoding: 'utf8', timeout: 10000 });
if (probe.error) fail('找不到 psql 命令', '  安装方法见 Day 22 讲义「先跑起来」;或者用 docker compose exec postgres psql …');
if (probe.status !== 0) {
  fail(
    `连不上 ${conn.host}:${conn.port}/${conn.db}`,
    `  psql 说:${probe.stderr.trim()}\n  · Docker:docker compose up -d,等 docker compose ps 显示 healthy\n  · 本机安装:确认服务已启动、.env 里的 POSTGRES_* 与建库时一致(见 Day 22 讲义)`,
  );
}
out(`服务器:${probe.stdout.trim().split(' on ')[0]}`);

// ---------- 第 1 幕:依次运行今天的 SQL ----------
const files = [
  ['01-setup.sql', '准备数据:用户、任务、清单、标签、员工'],
  ['02-joins.sql', 'JOIN 全家:INNER / LEFT / ON vs WHERE / RIGHT / CROSS / 自连接'],
  ['03-semi-anti.sql', '半连接 / 反连接:EXISTS / NOT EXISTS / NOT IN 遇到 NULL'],
  ['04-fanout.sql', '扇出:JOIN 之后再 SUM 会算重'],
  ['05-aggregate.sql', '聚合:COUNT / GROUP BY / HAVING / FILTER / string_agg'],
  ['06-subquery-cte.sql', '子查询、CTE 与递归 CTE'],
  ['07-null-and-order.sql', 'NULL 的三值逻辑与逻辑执行顺序'],
];
for (const [f, title] of files) {
  line(`${f}:${title}`);
  const r = run(['-f', `sql/day25/${f}`]);
  out(r.stdout.trimEnd());
  if (r.status !== 0) fail(`${f} 执行失败`, '  看上面 psql 的输出');
}

out('\n观察结束:表都留在 schema day25 里,可以 psql 连进去 SET search_path = day25; 继续玩');
