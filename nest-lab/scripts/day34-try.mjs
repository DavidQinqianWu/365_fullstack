// Day 34 观察脚本:找慢查询并优化 nest-lab —— pg_stat_statements、优化前后的执行计划、offset vs keyset、加负载前后对比。
//
// 跑:npm run day34            # 本机约 40 秒(构建 + 灌 30 万任务 + 两轮各 6 秒的负载)
//     npm run day34 -- --quick # 负载各 3 秒,约 30 秒;数字更抖,只看量级
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// pg_stat_statements 要先由超级用户开启(见讲义「先跑起来」);没开时,这个脚本跳过统计那部分,其余照跑。
//
// ⚠️ 会重建 schema app(开发用的那个,npm run db:seed:big);不碰 e2e:pg 的 app_test。跑完 app 里是 30 万任务的大数据,
//    想回到 3 条样品数据就 npm run db:reset。
// 计时都是 EXPLAIN (ANALYZE) 的 Execution Time,各跑 3 次;并行查询保持默认设置(和应用里一样)。
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runLoad } from './load-tasks.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
try {
  process.loadEnvFile(`${ROOT}.env`);
} catch {
  // 没有 .env 就用默认值
}
const QUICK = process.argv.includes('--quick');
const LOAD_SECONDS = QUICK ? 3 : 6;
const env = {
  ...process.env,
  PGHOST: process.env.POSTGRES_HOST ?? 'localhost',
  PGPORT: process.env.POSTGRES_PORT ?? '5432',
  PGUSER: process.env.POSTGRES_USER ?? 'nest_lab',
  PGPASSWORD: process.env.POSTGRES_PASSWORD ?? 'nest_lab_dev',
  PGDATABASE: process.env.POSTGRES_DB ?? 'nest_lab',
  PGCONNECT_TIMEOUT: '3',
  PGAPPNAME: 'day34',
};
const DATABASE_URL = `postgresql://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`;
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);
const fail = (title, hint) => {
  out(`\n❌ ${title}\n${hint}`);
  process.exit(1);
};
const PSQL = 'psql -w -X "$@" 2>&1';
const run = (args) => spawnSync('sh', ['-c', PSQL, 'sh', ...args], { cwd: ROOT, env, encoding: 'utf8', timeout: 600_000 });
const runFile = (f) => {
  const r = run(['-f', `sql/day34/${f}`]);
  out(r.stdout.trimEnd());
  if (r.status !== 0) fail(`${f} 执行失败`, '  看上面 psql 的输出');
  return r.stdout;
};
const ms = (s) => [...s.matchAll(/Execution Time: ([\d.]+) ms/g)].map((m) => Number(m[1]));
const fmt = (ts) => `${Math.min(...ts).toFixed(3)} – ${Math.max(...ts).toFixed(3)} ms(${ts.map((t) => t.toFixed(3)).join(' / ')})`;
const t0 = Date.now();

// nest-lab 实际发出的列表 SQL 的前半段(和 src/tasks/pg-tasks.repository.ts 的 SELECT_TASKS 一样)
const S = `SELECT t.id, t.title, t.done, t.created_at, coalesce(cl.items, '[]'::json) AS checklist FROM tasks t LEFT JOIN LATERAL (SELECT json_agg(json_build_object('text', c.text, 'done', c.done) ORDER BY c.position) AS items FROM checklist_items c WHERE c.task_id = t.id) cl ON true`;
// Day 34 的索引:直接从 schema.sql 里读,保证和真正的结构一致
const INDEX_DDL = readFileSync(`${ROOT}sql/schema.sql`, 'utf8').match(/^CREATE INDEX tasks_\w+ ON tasks .*;$/gm) ?? [];
const INDEX_NAMES = INDEX_DDL.map((d) => d.split(' ')[2]);
if (INDEX_DDL.length !== 3) fail('没能从 sql/schema.sql 里读到 3 条 CREATE INDEX tasks_…', `  读到的是:\n${INDEX_DDL.join('\n')}`);

// 同一个会话里:(可选)先在事务里删掉索引,每个查询 EXPLAIN ANALYZE 3 次,最后 ROLLBACK
const timeCases = (cases, { withoutIndexes = false } = {}) => {
  const body = cases.map(([, sql]) => Array.from({ length: 3 }, () => `EXPLAIN (ANALYZE, TIMING OFF) ${sql};`).join('\n')).join('\n');
  const script = `SET search_path = app; BEGIN; ${withoutIndexes ? `DROP INDEX ${INDEX_NAMES.join(', ')};` : ''}\n${body}\nROLLBACK;`;
  const r = run(['-c', script]);
  const times = ms(r.stdout);
  if (times.length !== cases.length * 3) fail('计时失败', r.stdout.slice(0, 2000));
  cases.forEach(([label], i) => out(`  ${label.padEnd(34)}${fmt(times.slice(i * 3, i * 3 + 3))}`));
};

// ---------- 第 0 幕:数据库和 pg_stat_statements ----------
line('第 0 幕:检查数据库和 pg_stat_statements');
const probe = spawnSync('psql', ['-w', '-X', '-At', '-c', 'SELECT version()'], { env, encoding: 'utf8', timeout: 10_000 });
if (probe.error) fail('找不到 psql 命令', '  安装方法见 Day 22 讲义「先跑起来」;或者用 docker compose exec postgres psql …');
if (probe.status !== 0) {
  fail(
    `连不上 ${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`,
    `  psql 说:${probe.stderr.trim()}\n  · Docker:docker compose up -d,等 docker compose ps 显示 healthy\n  · 本机安装:确认服务已启动、.env 里的 POSTGRES_* 与建库时一致(见 Day 22 讲义)`,
  );
}
out(`服务器:${probe.stdout.trim().split(' on ')[0]}`);
const pss = run(['-At', '-c', "SELECT count(*) FROM pg_extension WHERE extname = 'pg_stat_statements'", '-c', 'SELECT pg_stat_statements_reset()']);
const HAS_STATS = pss.status === 0 && /^1$/m.test(pss.stdout) && !/ERROR/.test(pss.stdout);
out(
  HAS_STATS
    ? 'pg_stat_statements:已开启,当前用户也能清零统计'
    : `⚠️ pg_stat_statements 不可用(下面跳过统计部分,其余照跑)。psql 说:\n${pss.stdout.trim()}\n  开启方法见讲义「先跑起来」:shared_preload_libraries + 重启 + 超级用户 CREATE EXTENSION + GRANT reset`,
);

// ---------- 第 1 幕:灌数据 ----------
line('第 1 幕:灌 30 万任务(npm run db:seed:big)');
const seed = spawnSync(process.execPath, ['scripts/db-reset.mjs', '--big'], { cwd: ROOT, env: { ...process.env, DATABASE_URL }, encoding: 'utf8' });
out((seed.stdout + seed.stderr).trim());
if (seed.status !== 0) fail('灌数据失败', '  看上面的输出');
const sizes = run(['-c', "SELECT indexrelid::regclass AS 索引, pg_size_pretty(pg_relation_size(indexrelid)) AS 大小 FROM pg_index WHERE indrelid = 'app.tasks'::regclass ORDER BY 1", '-c', "SELECT pg_size_pretty(pg_relation_size('app.tasks')) AS 表本身"]);
out(sizes.stdout.trimEnd());

// ---------- 第 2 幕:优化前后的执行计划 ----------
line('第 2 幕:热点查询优化前 / 后的执行计划(02-before-after.sql)');
runFile('02-before-after.sql');
const bm = run(['-At', '-c', 'SELECT created_at FROM app.tasks WHERE id = 3000']).stdout.trim();
const LIST_CASES = [
  ['A  ?sort=-createdAt 第一页', `${S} ORDER BY t.created_at DESC, t.id ASC LIMIT 21`],
  ['B  ?sort=title 第一页', `${S} ORDER BY t.title COLLATE "C" ASC, t.id ASC LIMIT 21`],
  ['C  ?q=urgent', `${S} WHERE t.title ILIKE '%urgent%' ESCAPE '\\' ORDER BY t.id ASC LIMIT 21`],
  ['C3 ?q=加急(2 个字)', `${S} WHERE t.title ILIKE '%加急%' ESCAPE '\\' ORDER BY t.id ASC LIMIT 21`],
  ['C4 ?q=12345(只有十几条)', `${S} WHERE t.title ILIKE '%12345%' ESCAPE '\\' ORDER BY t.id ASC LIMIT 21`],
  ['C5 ?q=不存在的任务(没有结果)', `${S} WHERE t.title ILIKE '%不存在的任务%' ESCAPE '\\' ORDER BY t.id ASC LIMIT 21`],
];
out('\n各跑 3 次 · 优化前(事务里删掉 3 个索引,最后 ROLLBACK):');
timeCases(LIST_CASES, { withoutIndexes: true });
out('各跑 3 次 · 优化后:');
timeCases(LIST_CASES);
out('各跑 3 次 · ?sort=-createdAt 深分页(书签前有 29.7 万条),索引都在,只差 SQL 写法:');
timeCases([
  ['A2 修复前:只有 OR', `${S} WHERE ((t.created_at < '${bm}'::timestamptz) OR (t.created_at = '${bm}'::timestamptz AND t.id > 3000::bigint)) ORDER BY t.created_at DESC, t.id ASC LIMIT 21`],
  ['A3 修复后:OR + 冗余范围', `${S} WHERE (t.created_at <= '${bm}'::timestamptz AND ((t.created_at < '${bm}'::timestamptz) OR (t.created_at = '${bm}'::timestamptz AND t.id > 3000::bigint))) ORDER BY t.created_at DESC, t.id ASC LIMIT 21`],
]);

out('各跑 3 次 · 代价:一次插入 1 万个任务(事务里做,最后 ROLLBACK):');
const INSERT_10K = "INSERT INTO tasks (title, done) SELECT 'Write invoice export ' || n, false FROM generate_series(1, 10000) AS n";
timeCases([['没有这 3 个索引', INSERT_10K]], { withoutIndexes: true });
timeCases([['有这 3 个索引', INSERT_10K]]);

// ---------- 第 3 幕:offset vs keyset ----------
line('第 3 幕:offset 深分页 vs keyset(03-offset-vs-keyset.sql)');
runFile('03-offset-vs-keyset.sql');
const kb = run(['-At', '-F', '|', '-c', 'SELECT created_at, id FROM app.tasks ORDER BY created_at, id LIMIT 1 OFFSET 199999']).stdout.trim().split('|');
out('\n各跑 3 次(第 10001 页):');
timeCases([
  ['OFFSET 200000', 'SELECT id, title FROM tasks ORDER BY created_at, id LIMIT 20 OFFSET 200000'],
  ['keyset (created_at, id) > 书签', `SELECT id, title FROM tasks WHERE (created_at, id) > ('${kb[0]}'::timestamptz, ${kb[1]}) ORDER BY created_at, id LIMIT 20`],
]);

// ---------- 第 4 幕:加负载,看 pg_stat_statements ----------
line(`第 4 幕:加负载(8 个并发 × ${LOAD_SECONDS} 秒),优化前 / 后各一轮`);
const top = () =>
  run([
    '-c',
    `SELECT calls AS 次数, round(total_exec_time::numeric) AS 总耗时_ms, round(mean_exec_time::numeric, 2) AS 平均_ms,
            regexp_replace(regexp_replace(query, '\\s+', ' ', 'g'), '^SELECT t\\.id, t\\.title.*\\) cl ON \\$\\d+', '[SELECT_TASKS]') AS 语句
     FROM pg_stat_statements
     WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database()) AND query LIKE '%tasks%' AND query NOT LIKE '%pg_stat_statements%'
     ORDER BY total_exec_time DESC LIMIT 5`,
  ]).stdout.trimEnd();
try {
  out('\n--- 优化前:删掉 3 个索引(keysetCondition 的修复已经在代码里了,这一轮只差索引)');
  run(['-c', `SET search_path = app; DROP INDEX ${INDEX_NAMES.join(', ')};`]);
  if (HAS_STATS) run(['-c', 'SELECT pg_stat_statements_reset()']);
  await runLoad({ seconds: LOAD_SECONDS, concurrency: 8, databaseUrl: DATABASE_URL, log: out });
  if (HAS_STATS) out(`\n  pg_stat_statements 总耗时前 5:\n${top()}`);
} finally {
  // 不管上面成不成功,都把索引建回来(和 schema.sql 里的一模一样)
  const r = run(['-c', `SET search_path = app; ${INDEX_DDL.join(' ')} ANALYZE tasks;`]);
  if (/ERROR/.test(r.stdout)) fail('索引没能建回来,请 npm run db:seed:big 重建', r.stdout);
}
out('\n--- 优化后:索引按 schema.sql 建回来');
if (HAS_STATS) run(['-c', 'SELECT pg_stat_statements_reset()']);
await runLoad({ seconds: LOAD_SECONDS, concurrency: 8, databaseUrl: DATABASE_URL, log: out });
if (HAS_STATS) {
  out(`\n  pg_stat_statements 总耗时前 5:\n${top()}`);
  line('第 5 幕:pg_stat_statements 的完整报表(01-pg-stat-statements.sql,优化后这一轮)');
  runFile('01-pg-stat-statements.sql');
}

out(`\n观察结束(用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒):schema app 里现在是 30 万任务;想回到 3 条样品数据就 npm run db:reset`);
