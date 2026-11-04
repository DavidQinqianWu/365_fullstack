// Day 22 观察脚本:PostgreSQL 是一个「服务器」,psql 只是客户端之一。
//
// 跑:npm run day22
// 前提:PostgreSQL 已经在运行(docker compose up -d,或本机安装),并且装了 psql 命令行。
// 连接参数来自 .env 里的 POSTGRES_*(见 .env.example),都没写时用开发默认值。
// 今天不引入 pg 驱动(Day 27 才引入),所以这里用 node:child_process 调用 psql。
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
try {
  process.loadEnvFile(`${ROOT}.env`); // Node 20.12+ 内置;没有 .env 就用默认值
} catch {
  // 没有 .env 不算错
}

const conn = {
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: process.env.POSTGRES_PORT ?? '5432',
  user: process.env.POSTGRES_USER ?? 'nest_lab',
  password: process.env.POSTGRES_PASSWORD ?? 'nest_lab_dev',
  db: process.env.POSTGRES_DB ?? 'nest_lab',
};
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);
// -w:永远不提示输入密码(没有密码就直接失败,而不是挂住等键盘);-X:不读 ~/.psqlrc;PGCONNECT_TIMEOUT:连不上 3 秒就放弃
const pgEnv = (appName = 'day22-observer') => ({
  ...process.env,
  PGHOST: conn.host,
  PGPORT: conn.port,
  PGUSER: conn.user,
  PGPASSWORD: conn.password,
  PGDATABASE: conn.db,
  PGCONNECT_TIMEOUT: '3',
  PGAPPNAME: appName,
});
const psql = (args, appName) =>
  spawnSync('psql', ['-w', '-X', ...args], { env: pgEnv(appName), encoding: 'utf8', timeout: 15000 });
const sql = (query) => psql(['-At', '-F', ' | ', '-c', query]);

function fail(title, hint) {
  out(`\n❌ ${title}`);
  out(hint);
  process.exit(1);
}

// ---------- 第 0 幕:先确认「服务器在不在」 ----------
line('第 0 幕:检查客户端与服务器');
const ver = spawnSync('psql', ['--version'], { encoding: 'utf8' });
if (ver.error) {
  fail(
    '找不到 psql 命令(客户端没装)',
    [
      '  · 用 Docker:docker compose exec postgres psql -U nest_lab -d nest_lab   (容器里自带 psql)',
      '  · 想在本机直接用:macOS `brew install libpq`(再按提示把它加进 PATH);Ubuntu `sudo apt install postgresql-client`;',
      '    Windows 装 PostgreSQL 官方安装包时勾选 Command Line Tools',
    ].join('\n'),
  );
}
out(`客户端:${ver.stdout.trim()}`);
const ready = spawnSync('pg_isready', ['-h', conn.host, '-p', conn.port, '-t', '3'], { encoding: 'utf8' });
if (!ready.error && ready.status !== 0) {
  fail(
    `服务器没有响应:${conn.host}:${conn.port}(${ready.stdout.trim()})`,
    [
      '  · 用 Docker:在 nest-lab 目录 `cp .env.example .env`(第一次),再 `docker compose up -d`,',
      '    等 `docker compose ps` 显示 healthy 后重跑',
      '  · 本机安装:确认 PostgreSQL 服务已启动(macOS `brew services start postgresql@16`,Ubuntu `sudo service postgresql start`)',
      '  · 端口不是 5432?在 .env 里改 POSTGRES_PORT',
    ].join('\n'),
  );
}
const who = sql('SELECT version()');
if (who.status !== 0) {
  fail(
    `服务器在,但登录失败(用户 ${conn.user},库 ${conn.db})`,
    `  psql 说:${who.stderr.trim()}\n  · 检查 .env 的 POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB 是否和建库时一致\n  · 本机安装时要先建角色和库,步骤见 Day 22 讲义「没有 Docker 怎么办」`,
  );
}
out(`服务器:${who.stdout.trim().split(' on ')[0]}`);
out(`连接:postgresql://${conn.user}:***@${conn.host}:${conn.port}/${conn.db}`);

// ---------- 第 1 幕:层级 —— 集群 → 数据库 → schema → 表 ----------
line('第 1 幕:我在哪?(集群 → 数据库 → schema → 表)');
out(`这个集群里的数据库:${sql("SELECT string_agg(datname, ', ' ORDER BY datname) FROM pg_database WHERE NOT datistemplate").stdout.trim()}`);
out(`当前连接:${sql('SELECT current_user, current_database(), current_schema()').stdout.trim()}   (用户 | 数据库 | schema)`);

// ---------- 第 2 幕:每个连接一个后端进程 ----------
line('第 2 幕:三个客户端同时连进来,服务器那边有几个进程?');
const clients = ['day22-A', 'day22-B', 'day22-C'].map(
  (name) =>
    new Promise((resolve) => {
      const child = spawn('psql', ['-w', '-X', '-At', '-c', 'SELECT pg_backend_pid()', '-c', 'SELECT pg_sleep(3)'], {
        env: pgEnv(name),
      });
      let stdout = '';
      child.stdout.on('data', (c) => (stdout += c));
      child.on('close', () => resolve({ name, clientPid: child.pid, backendPid: stdout.trim().split('\n')[0] }));
    }),
);
await new Promise((r) => setTimeout(r, 1000)); // 等三个客户端都连上
const activity = sql(
  "SELECT pid, application_name, state, left(query, 30) FROM pg_stat_activity WHERE application_name LIKE 'day22-%' ORDER BY application_name",
);
out('pg_stat_activity(服务器眼里的连接):');
out('  pid | application_name | state | query');
for (const row of activity.stdout.trim().split('\n')) out(`  ${row}`);
// 如果数据库就在这台机器上(不是 Docker / 远程),还能用 ps 亲眼看到这些进程
const mine = activity.stdout.trim().split(' | ')[0]; // 用 day22-A 的后端 pid(它还在 pg_sleep,进程一定还活着)
if (existsSync(`/proc/${mine}`)) {
  const ppid = readFileSync(`/proc/${mine}/stat`, 'utf8').split(') ')[1]?.split(' ')[1];
  const ps = spawnSync('ps', ['-o', 'pid,ppid,cmd', '--ppid', ppid ?? '1'], { encoding: 'utf8' });
  out(`\n数据库就在本机,用 ps 看主进程 ${ppid} 的子进程(A / B / C 还连着的时候):`);
  for (const l of ps.stdout.trim().split('\n')) out(`  ${l}`);
} else {
  out('\n(数据库不在本机进程空间里,比如在 Docker 容器中,所以这里不用 ps;可以 docker compose exec postgres ps aux 看)');
}

const done = await Promise.all(clients);
out('\n对照每个客户端自己问到的 pg_backend_pid():');
for (const c of done) out(`  ${c.name}:客户端进程 pid ${c.clientPid} → 服务器后端进程 pid ${c.backendPid}`);
const backendPids = done.map((c) => c.backendPid);
out(`三个后端 pid 互不相同:${new Set(backendPids).size === 3 ? '是' : '否'}`);
const left = sql("SELECT count(*) FROM pg_stat_activity WHERE application_name IN ('day22-A', 'day22-B', 'day22-C')").stdout.trim();
out(`三个客户端退出之后,pg_stat_activity 里还剩它们的连接:${left} 个`);
const postmaster = sql('SELECT pg_postmaster_start_time()').stdout.trim();
out(`它们都由同一个主进程(postmaster,启动于 ${postmaster})fork 出来;客户端断开,对应的后端进程就退出`);
// ---------- 第 3 幕:跑今天的 SQL 文件 ----------
const files = ['01-create.sql', '02-crud.sql', '03-forgot-where.sql', '04-no-order.sql', '05-declarative.sql', '06-no-safety-net.sql'];
for (const f of files) {
  line(`第 3 幕:psql -f sql/day22/${f}`);
  // 2>&1:让 NOTICE / WARNING(psql 写到 stderr)按真实顺序夹在结果中间
  const r = spawnSync('sh', ['-c', 'psql -w -X -f "$1" 2>&1', 'sh', `sql/day22/${f}`], {
    cwd: ROOT,
    env: pgEnv(),
    encoding: 'utf8',
    timeout: 15000,
  });
  out(r.stdout.trimEnd());
  if (r.status !== 0) fail(`${f} 执行失败`, '  看上面 psql 的报错');
}

out('\n观察结束:tasks 表留在库里,可以 psql 连进去继续玩(重跑本脚本会先 DROP 再重建)');
