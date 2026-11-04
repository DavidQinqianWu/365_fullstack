// Day 32 观察脚本:部分索引、表达式索引、外键列的索引,以及索引的代价(写放大、WAL、HOT、没用的 / 重复的索引)。
//
// 跑:npm run day32
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// 所有表都在独立的 schema day32 里,每次运行都会先把 day32 整个删掉重建(10 万会员 + 100 万任务,本机约 5 秒)。
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
  PGAPPNAME: 'day32',
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
  const r = run(['-f', `sql/day32/${f}`]);
  out(r.stdout.trimEnd());
  if (r.status !== 0) fail(`${f} 执行失败`, '  看上面 psql 的输出');
  return r.stdout;
};
// 跑 n 次 EXPLAIN (ANALYZE),取每次的 Execution Time(数据库内部的执行时间,不含网络和打印)
const execTimes = (sql, n = 3, settings = '') => {
  const script = Array.from({ length: n }, () => `${settings} EXPLAIN (ANALYZE, TIMING OFF) ${sql};`).join('\n');
  const r = run(['-c', `SET search_path = day32; SET max_parallel_workers_per_gather = 0; ${script}`]);
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
  for (const [name, def] of indexes) {
    const r = run(['-c', `SET search_path = day32; CREATE ${def.startsWith('UNIQUE') ? 'UNIQUE INDEX ' + name + ' ON ' + def.slice(7) : 'INDEX ' + name + ' ON ' + def};`]);
    if (r.status !== 0 || /ERROR/.test(r.stdout)) fail(`建索引 ${name} 失败`, r.stdout);
  }
  run(['-c', 'ANALYZE day32.tasks', '-c', 'ANALYZE day32.users']);
  for (const [label, sql] of cases) out(`  ${label.padEnd(36)}${fmt(execTimes(sql))}`);
  if (indexes.length) run(['-c', `SET search_path = day32; ${indexes.map(([n]) => `DROP INDEX ${n};`).join(' ')}`]);
};
// 一组 psql 命令依次执行(同一个会话),返回输出
const session = (...cmds) => run(['-c', 'SET search_path = day32', '-c', 'SET client_min_messages = warning', ...cmds.flatMap((c) => ['-c', c])]);
// 每个 EXPLAIN 只取最上面那个节点(Insert / Update)的 WAL;下面的 Function Scan 也会单独报自己的(给自增 id 记的那点 WAL)
const wal = (s) =>
  s.split('QUERY PLAN').slice(1).map((block) => block.match(/WAL: records=\d+(?: fpi=\d+)? bytes=(\d+)/)).filter(Boolean).map((m) => Number(m[1]));
const ms = (s) => [...s.matchAll(/Execution Time: ([\d.]+) ms/g)].map((m) => Number(m[1]));
const mb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;
const range = (xs, f) => (Math.min(...xs) === Math.max(...xs) ? f(xs[0]) : `${f(Math.min(...xs))} – ${f(Math.max(...xs))}`);

// ---------- 第 1 幕:造数据 ----------
line('第 1 幕:准备数据(01-setup.sql)');
out('正在造 10 万会员 + 100 万任务,请稍等……');
runFile('01-setup.sql');

line('第 2 幕:部分索引(02-partial.sql)');
runFile('02-partial.sql');
const OPEN_Q = 'SELECT id, title, created_at FROM tasks WHERE done = false ORDER BY created_at DESC LIMIT 20';
out('\n各跑 3 次(未完成任务里最新的 20 个):');
bench([['b_full', 'tasks (done, created_at)']], [['完整索引 (done, created_at)', OPEN_Q]]);
bench([['b_part', 'tasks (created_at) WHERE done = false']], [['部分索引 (created_at) WHERE done = false', OPEN_Q]]);

out('\nnest-lab 用的 pg 驱动发 done = $1 时,数据库拿到的是什么计划?(不给 name 的查询:每次都带着实际参数值做计划)');
{
  run(['-c', 'CREATE INDEX b_part ON day32.tasks (created_at) WHERE done = false', '-c', 'ANALYZE day32.tasks']);
  const { default: pg } = await import('pg');
  const client = new pg.Client({ host: env.PGHOST, port: Number(env.PGPORT), user: env.PGUSER, password: env.PGPASSWORD, database: env.PGDATABASE });
  await client.connect();
  const sql = 'EXPLAIN (COSTS OFF) SELECT id, title, created_at FROM day32.tasks WHERE done = $1 ORDER BY created_at DESC LIMIT 20';
  const unnamed = await client.query(sql, [false]);
  out(unnamed.rows.map((r) => '  ' + r['QUERY PLAN']).join('\n'));
  await client.end();
  run(['-c', 'DROP INDEX day32.b_part']);
}

line('第 3 幕:表达式索引(03-expression.sql)');
runFile('03-expression.sql');
out('\n各跑 3 次:');
bench(
  [['b_lower', "UNIQUE users (lower(email))"]],
  [
    ['lower(email) = …(能用表达式索引)', "SELECT id FROM users WHERE lower(email) = 'user42@example.com'"],
    ['email ILIKE …(用不上,全表扫描)', "SELECT id FROM users WHERE email ILIKE 'user42@example.com'"],
  ],
);
bench(
  [['b_day', "tasks (((created_at AT TIME ZONE 'UTC')::date))"]],
  [
    ['同一个表达式 = 某一天', "SELECT count(*) FROM tasks WHERE (created_at AT TIME ZONE 'UTC')::date = '2025-06-01'"],
    ['created_at::date = 某一天(用不上)', "SELECT count(*) FROM tasks WHERE created_at::date = '2025-06-01'"],
  ],
);

line('第 4 幕:外键列的索引(04-fk.sql)');
runFile('04-fk.sql');
out('\n各跑 3 次(BEGIN → EXPLAIN ANALYZE DELETE → ROLLBACK,不真删):');
const deleteBench = (label) => {
  for (const [what, where] of [['注销 1 个没有任务的会员', 'id = 50000'], ['注销 10 个没有任务的会员', 'id BETWEEN 50001 AND 50010'], ['注销 5000 号(级联删他的任务)', 'id = 5000']]) {
    const tx = Array.from({ length: 3 }, () => ['BEGIN', `EXPLAIN (ANALYZE, TIMING OFF) DELETE FROM users WHERE ${where}`, 'ROLLBACK']).flat();
    out(`  ${label} · ${what.padEnd(20)}${fmt(ms(session(...tx).stdout))}`);
  }
};
deleteBench('没有索引');
run(['-c', 'CREATE INDEX b_owner ON day32.tasks (owner_id)']);
deleteBench('有索引  ');
run(['-c', 'DROP INDEX day32.b_owner']);

line('第 5 幕:写放大(05-write-cost.sql)');
runFile('05-write-cost.sql');
out('\n各跑 3 次(每次新建表 w → 建 N 个索引 → INSERT 20 万行 → 把 20 万行都 UPDATE 一次;EXPLAIN (ANALYZE, WAL) 计时和数 WAL):');
const IDX = ['(owner_id)', '(created_at)', '(title)', '(owner_id, created_at DESC, id DESC)', '(lower(title))', '(title, created_at)'];
for (const n of [0, 1, 3, 6]) {
  const ins = [], upd = [], insWal = [], updWal = [];
  for (let i = 0; i < 3; i++) {
    const r = session(
      'DROP TABLE IF EXISTS w',
      'CREATE TABLE w (id bigint GENERATED ALWAYS AS IDENTITY, owner_id bigint NOT NULL, title text NOT NULL, done boolean NOT NULL, created_at timestamptz NOT NULL) WITH (autovacuum_enabled = false)',
      ...IDX.slice(0, n).map((d) => `CREATE INDEX ON w ${d}`),
      "EXPLAIN (ANALYZE, WAL, TIMING OFF) INSERT INTO w (owner_id, title, done, created_at) SELECT 1 + n % 10000, '任务 ' || n, n % 10 <> 0, timestamptz '2024-01-01 00:00+00' + n * interval '1 minute' FROM generate_series(1, 200000) AS n",
      'EXPLAIN (ANALYZE, WAL, TIMING OFF) UPDATE w SET done = NOT done',
      'DROP TABLE w',
    );
    const [a, b] = ms(r.stdout);
    const [wa, wb] = wal(r.stdout);
    if (a === undefined || wb === undefined) fail('写放大实验失败', r.stdout);
    ins.push(a), upd.push(b), insWal.push(wa), updWal.push(wb);
  }
  out(`  ${n} 个索引  INSERT ${fmt(ins)}  WAL ${range(insWal, mb)}`);
  out(`             UPDATE ${fmt(upd)}  WAL ${range(updWal, mb)}`);
}

line('第 6 幕:HOT 更新(06-hot.sql)');
runFile('06-hot.sql');
out('\n各跑 3 次(每次新建表、更新 1 万行;HOT 次数来自 pg_stat_xact_user_tables,即本事务内的计数):');
const HOT_CASES = [
  ['a fillfactor 100 · 改 done', 100, '', 'done = NOT done'],
  ['b fillfactor 90 · 改 done', 90, '', 'done = NOT done'],
  ['c fillfactor 90 · 改 title(无索引)', 90, '', "title = title || '(改)'"],
  ['d fillfactor 90 · 改 title(有索引)', 90, 'CREATE INDEX ON h (title)', "title = title || '(改)'"],
  ['e fillfactor 90 · 改 INCLUDE 的 title', 90, 'CREATE INDEX ON h (owner_id) INCLUDE (title)', "title = title || '(改)'"],
];
for (const [label, ff, extra, set] of HOT_CASES) {
  const times = [], hots = [], wals = [];
  for (let i = 0; i < 3; i++) {
    const r = session(
      'DROP TABLE IF EXISTS h',
      `CREATE TABLE h (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, owner_id bigint NOT NULL, title text NOT NULL, done boolean NOT NULL, created_at timestamptz NOT NULL) WITH (fillfactor = ${ff}, autovacuum_enabled = false)`,
      "INSERT INTO h (owner_id, title, done, created_at) SELECT 1 + n % 10000, '任务 ' || n, n % 10 <> 0, timestamptz '2024-01-01 00:00+00' + n * interval '1 minute' FROM generate_series(1, 100000) AS n",
      'CREATE INDEX ON h (owner_id)',
      'CREATE INDEX ON h (created_at)',
      ...(extra ? [extra] : []),
      'BEGIN',
      `EXPLAIN (ANALYZE, WAL, TIMING OFF) UPDATE h SET ${set} WHERE id % 10 = 0`,
      "SELECT 'HOT=' || n_tup_hot_upd FROM pg_stat_xact_user_tables WHERE relid = 'h'::regclass",
      'COMMIT',
      'DROP TABLE h',
    );
    const hot = r.stdout.match(/HOT=(\d+)/);
    if (!hot) fail('HOT 实验失败', r.stdout);
    times.push(...ms(r.stdout)), wals.push(...wal(r.stdout)), hots.push(Number(hot[1]));
  }
  out(`  ${label.padEnd(30)}${fmt(times)}  WAL ${range(wals, mb)}  HOT ${range(hots, (x) => `${x} / 10000`)}`);
}

line('第 7 幕:没用的索引、重复的索引(07-unused.sql)');
runFile('07-unused.sql');

out('\n观察结束:表留在 schema day32 里(实验用的索引都已删掉),可以 psql 连进去 SET search_path = day32; 继续玩');
