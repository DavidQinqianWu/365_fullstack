// Day 29 观察脚本:百万行 tasks 表上,没有索引 vs 有索引;B-tree 长什么样;建了索引为什么不用。
//
// 跑:npm run day29
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// 所有表都在独立的 schema day29 里,每次运行都会先把 day29 整个删掉重建(造 100 万行,本机约 2 秒,慢的机器可能几十秒)。
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
  PGAPPNAME: 'day29',
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
  const r = run(['-f', `sql/day29/${f}`]);
  out(r.stdout.trimEnd());
  if (r.status !== 0) fail(`${f} 执行失败`, '  看上面 psql 的输出');
  return r.stdout;
};
// 跑 n 次 EXPLAIN (ANALYZE),取每次的 Execution Time(数据库内部的执行时间,不含网络和打印)
const execTimes = (sql, n = 3, settings = '') => {
  const script = Array.from({ length: n }, () => `${settings} EXPLAIN (ANALYZE, TIMING OFF) ${sql};`).join('\n');
  const r = run(['-c', `SET search_path = day29; ${script}`]);
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
line('第 1 幕:造一张 100 万行、没有任何索引的 tasks 表(01-setup.sql)');
out('正在造数据,请稍等……');
runFile('01-setup.sql');

// ---------- 第 2 幕:没有索引 ----------
line('第 2 幕:没有索引时的计划(02-no-index.sql)');
runFile('02-no-index.sql');
const QUERIES = [
  ['① 按 id 找一行     ', 'SELECT * FROM tasks WHERE id = 500000'],
  ['② 按 owner_id 找   ', 'SELECT * FROM tasks WHERE owner_id = 5000'],
  ['③ 按 title 精确找  ', "SELECT * FROM tasks WHERE title = '任务 777777'"],
];
out('\n各跑 3 次的实际执行时间(没有索引):');
const before = QUERIES.map(([label, sql]) => {
  const ts = execTimes(sql);
  out(`  ${label}${fmt(ts)}`);
  return ts;
});

// ---------- 第 3 幕:行住在哪 ----------
line('第 3 幕:行在表里住在哪(03-ctid.sql)');
runFile('03-ctid.sql');

// ---------- 第 4 幕:建索引 ----------
line('第 4 幕:建索引(04-create-indexes.sql)');
runFile('04-create-indexes.sql');

// ---------- 第 5 幕:有了索引 ----------
line('第 5 幕:有索引以后的计划(05-with-index.sql)');
runFile('05-with-index.sql');
out('\n各跑 3 次的实际执行时间(有索引):');
QUERIES.forEach(([label, sql], i) => {
  const ts = execTimes(sql);
  const speedup = Math.min(...before[i]) / Math.max(...ts);
  out(`  ${label}${fmt(ts)}  ← 至少快了约 ${Math.floor(speedup)} 倍`);
});

// ---------- 第 6 幕:选择性 ----------
line('第 6 幕:建了索引 ≠ 一定会用(06-selectivity.sql)');
runFile('06-selectivity.sql');
out('\ndone = true(约 90% 的行),各跑 3 次:');
out(`  优化器自己选(Seq Scan)          ${fmt(execTimes('SELECT * FROM tasks WHERE done = true'))}`);
out(`  强行走索引(enable_seqscan=off)  ${fmt(execTimes('SELECT * FROM tasks WHERE done = true', 3, 'SET enable_seqscan = off;'))}`);

// ---------- 第 7 幕:B-tree 的形状 ----------
line('第 7 幕:主键索引 tasks_pkey 的形状(07-btree-shape.sql,需要超级用户)');
const shape = run(['-f', 'sql/day29/07-btree-shape.sql']);
if (/permission denied|must be superuser/.test(shape.stdout)) {
  out('当前用户不是超级用户,不能用 pageinspect(Docker 里 nest_lab 是超级用户,可以直接跑)。改用估算:');
  out(
    run([
      '-c',
      `SELECT pg_relation_size('day29.tasks_pkey') / 8192 AS 索引页数,
              floor((8192 - 24 - 16) / (8 + 8 + 4)) AS 每页最多能放的键数,
              ceil(ln(pg_relation_size('day29.tasks_pkey') / 8192.0) / ln(floor((8192 - 24 - 16) / (8 + 8 + 4)))) + 1 AS 估算树高`,
    ]).stdout.trimEnd(),
  );
  out('(每个条目:条目头 8 字节(里面就是指向表中那一行的 ctid)+ bigint 键 8 字节 + 页内的行指针 4 字节 = 20 字节;\n 页头和页尾共约 40 字节。建索引时叶子页默认只填 90%(fillfactor),所以实际每页约 360 多个。\n 本课程环境用超级用户实测的结果见讲义:树高 3,叶子页每页 367 个)');
} else {
  out(shape.stdout.trimEnd());
}

out('\n观察结束:表和索引都留在 schema day29 里,可以 psql 连进去 SET search_path = day29; 继续玩');
