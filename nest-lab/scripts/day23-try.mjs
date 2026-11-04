// Day 23 观察脚本:同一份数据,从「大流水账」一步步拆到 3NF,看异常怎么消失、反范式怎么出错。
//
// 跑:npm run day23
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// 所有表都建在独立的 schema day23 里,不碰 Day 22 的 public.tasks;每次运行都会先把 day23 整个删掉重建。
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
  PGAPPNAME: 'day23',
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
  ['01-wide-table.sql', '一本什么都记的大流水账'],
  ['02-anomalies.sql', '宽表的三类异常'],
  ['03-1nf.sql', '第一范式:一格一值'],
  ['04-2nf.sql', '第二范式:不能只依赖主键的一部分'],
  ['05-3nf.sql', '第三范式:不能间接依赖主键'],
  ['06-rebuild-view.sql', '用 JOIN 拼回原来的样子'],
  ['07-denormalize.sql', '故意反范式:计数缓存'],
];
for (const [f, title] of files) {
  line(`${f}:${title}`);
  const r = run(['-f', `sql/day23/${f}`]);
  out(r.stdout.trimEnd());
  if (r.status !== 0) fail(`${f} 执行失败`, '  看上面 psql 的输出');
}

// ---------- 第 2 幕:同一个事实存了几份 ----------
line('结算:同一个事实,在每一步里存了几份?');
const count = (query) => run(['-At', '-c', `SET search_path = day23; ${query}`]).stdout.trim().split('\n').at(-1);
const rows = [
  ['宽表 tasks_wide', "SELECT count(*) FROM tasks_wide WHERE owner_email = 'alice@example.com'", "SELECT count(*) FROM tasks_wide WHERE title = '学 psql'"],
  ['1NF tasks_1nf', "SELECT count(*) FROM tasks_1nf WHERE owner_email = 'alice@example.com'", "SELECT count(*) FROM tasks_1nf WHERE title = '学 psql'"],
  ['2NF tasks_2nf', "SELECT count(*) FROM tasks_2nf WHERE owner_email = 'alice@example.com'", "SELECT count(*) FROM tasks_2nf WHERE title = '学 psql'"],
  ['3NF users / tasks', "SELECT count(*) FROM users WHERE email = 'alice@example.com'", "SELECT count(*) FROM tasks WHERE title = '学 psql'"],
];
out('步骤                「Alice 的邮箱」存了几份   「任务 1 的标题」存了几份');
for (const [label, q1, q2] of rows) out(`${label.padEnd(20)}${count(q1).padStart(10)}${count(q2).padStart(26)}`);

line('day23 里最后有哪些表');
out(run(['-c', '\\dt day23.*']).stdout.trimEnd());
out('\n观察结束:表都留在 schema day23 里,可以 psql 连进去 SET search_path = day23; 继续玩');
