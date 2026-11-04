// Day 24 观察脚本:主键怎么发号、integer 会用完、UUID v4 vs v7、约束怎么拒绝坏数据、ON DELETE、并发注册。
//
// 跑:npm run day24
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// 所有表都在独立的 schema day24 里,每次运行都会先把 day24 整个删掉重建。
import { spawn, spawnSync } from 'node:child_process';
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
const env = (app = 'day24') => ({
  ...process.env,
  PGHOST: conn.host,
  PGPORT: conn.port,
  PGUSER: conn.user,
  PGPASSWORD: conn.password,
  PGDATABASE: conn.db,
  PGCONNECT_TIMEOUT: '3',
  PGAPPNAME: app,
});
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);
const fail = (title, hint) => {
  out(`\n❌ ${title}\n${hint}`);
  process.exit(1);
};
// -w 永不提示密码、-X 不读 ~/.psqlrc;2>&1 让 NOTICE / ERROR 按真实顺序夹在结果中间
const PSQL = 'psql -w -X "$@" 2>&1';
const run = (args) => spawnSync('sh', ['-c', PSQL, 'sh', ...args], { cwd: ROOT, env: env(), encoding: 'utf8', timeout: 60000 });

// ---------- 第 0 幕:数据库在不在 ----------
line('第 0 幕:检查数据库');
const probe = spawnSync('psql', ['-w', '-X', '-At', '-c', 'SELECT version()'], { env: env(), encoding: 'utf8', timeout: 10000 });
if (probe.error) fail('找不到 psql 命令', '  安装方法见 Day 22 讲义「先跑起来」;或者用 docker compose exec postgres psql …');
if (probe.status !== 0) {
  fail(
    `连不上 ${conn.host}:${conn.port}/${conn.db}`,
    `  psql 说:${probe.stderr.trim()}\n  · Docker:docker compose up -d,等 docker compose ps 显示 healthy\n  · 本机安装:确认服务已启动、.env 里的 POSTGRES_* 与建库时一致(见 Day 22 讲义)`,
  );
}
out(`服务器:${probe.stdout.trim().split(' on ')[0]}`);

// ---------- 第 1 幕:依次运行 01–06 ----------
const files = [
  ['01-primary-keys.sql', '主键怎么发号:serial / ALWAYS / BY DEFAULT'],
  ['02-integer-limit.sql', 'integer 会用完'],
  ['03-uuid.sql', 'UUID v4 vs v7(PG 16 没有内置 uuidv7)'],
  ['04-constraints.sql', '把规矩写进表定义'],
  ['05-violations.sql', '逐条违反约束:SQLSTATE 错误码'],
  ['06-on-delete.sql', 'ON DELETE CASCADE / RESTRICT / SET NULL'],
];
for (const [f, title] of files) {
  line(`${f}:${title}`);
  const r = run(['-f', `sql/day24/${f}`]);
  out(r.stdout.trimEnd());
  if (r.status !== 0) fail(`${f} 执行失败`, '  看上面 psql 的输出');
}

// ---------- 第 2 幕:两个请求同时注册同一个邮箱 ----------
// 同时起两个 psql 进程,各自走一遍「先查有没有 → 等 1 秒 → 插入 → 提交」
function session(tbl, who) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('sh', ['-c', PSQL, 'sh', '-v', `tbl=${tbl}`, '-v', `who=${who}`, '-f', 'sql/day24/07-race-session.sql'], {
      cwd: ROOT,
      env: env(`day24-${who}`),
    });
    let text = '';
    child.stdout.on('data', (c) => (text += c));
    child.on('close', () => resolve({ who, text: text.trimEnd(), ms: Date.now() - started }));
  });
}
async function race(tbl, title) {
  line(title);
  const setup = run(['-q', '-f', 'sql/day24/07-race-setup.sql']);
  if (setup.status !== 0) fail('07-race-setup.sql 执行失败', setup.stdout);
  const results = await Promise.all([session(tbl, 'A'), session(tbl, 'B')]);
  for (const r of results) {
    out(`--- 请求 ${r.who}(用时 ${(r.ms / 1000).toFixed(1)} 秒)`);
    out(r.text);
  }
  out(`--- 最后表里有几个 carol@example.com:`);
  out(run(['-c', `SELECT id, email, who FROM day24.${tbl} ORDER BY id`]).stdout.trimEnd());
}
await race('signup_no_uk', '第 2 幕 A:没有唯一约束,只靠「先查后插」');
await race('signup_uk', '第 2 幕 B:同样的流程,邮箱上有唯一约束');

out('\n观察结束:表都留在 schema day24 里,可以 psql 连进去 SET search_path = day24; 继续玩');
