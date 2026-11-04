// Day 26 观察脚本:窗口函数、UPSERT(含并发注册)、RETURNING、JSONB、数组、timestamptz 与夏令时、枚举。
//
// 跑:npm run day26
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// 所有表都在独立的 schema day26 里,每次运行都会先把 day26 整个删掉重建。
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
const env = (app = 'day26') => ({
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
  ['01-setup.sql', '准备数据'],
  ['02-window.sql', '窗口函数:不折叠行;每组最新的三种写法'],
  ['03-upsert.sql', 'INSERT … ON CONFLICT'],
  ['05-returning.sql', 'RETURNING:写完当场拿回结果'],
  ['06-jsonb.sql', 'JSONB:一张自由格式的便条'],
  ['07-arrays.sql', '数组 vs 中间表'],
  ['08-time.sql', 'timestamptz vs timestamp,夏令时'],
  ['09-enum.sql', '枚举(点到为止)'],
];
for (const [f, title] of files) {
  line(`${f}:${title}`);
  const r = run(['-f', `sql/day26/${f}`]);
  out(r.stdout.trimEnd());
  if (r.status !== 0) fail(`${f} 执行失败`, '  看上面 psql 的输出');
}

// ---------- 第 2 幕:用 UPSERT 改写 Day 24 的并发注册 ----------
// 同时起两个 psql 进程,各自「等 1 秒 → INSERT … ON CONFLICT DO NOTHING RETURNING → 提交」
function session(who) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('sh', ['-c', PSQL, 'sh', '-v', `who=${who}`, '-f', 'sql/day26/04-race-session.sql'], {
      cwd: ROOT,
      env: env(`day26-${who}`),
    });
    let text = '';
    child.stdout.on('data', (c) => (text += c));
    child.on('close', (code) => resolve({ who, code, text: text.trimEnd(), ms: Date.now() - started }));
  });
}
line('第 2 幕:两个请求同时注册 erin@example.com,这次用 ON CONFLICT DO NOTHING');
const setup = run(['-q', '-f', 'sql/day26/04-race-setup.sql']);
if (setup.status !== 0) fail('04-race-setup.sql 执行失败', setup.stdout);
const results = await Promise.all([session('A'), session('B')]);
for (const r of results) {
  out(`--- 请求 ${r.who}(用时 ${(r.ms / 1000).toFixed(1)} 秒,psql 退出码 ${r.code})`);
  out(r.text);
}
out('--- 最后表里:');
out(run(['-c', 'SELECT id, email, who FROM day26.signups ORDER BY id']).stdout.trimEnd());

out('\n观察结束:表都留在 schema day26 里,可以 psql 连进去 SET search_path = day26; 继续玩');
