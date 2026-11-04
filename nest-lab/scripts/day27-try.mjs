// Day 27 观察脚本:nest-lab 第一次真正读写 PostgreSQL。
//
// 跑:npm run day27(= nest build + 本脚本)
// 前提:PostgreSQL 已运行、本机有 psql(Day 22)。连接串来自 .env 的 DATABASE_URL,没有就用开发默认值。
// 用独立的 schema app_day27(每次运行都会重建),不碰开发用的 app、e2e 用的 app_test。
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
try {
  process.loadEnvFile(`${ROOT}.env`);
} catch {
  // 没有 .env 就用默认值
}
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://nest_lab:nest_lab_dev@localhost:5432/nest_lab';
const SCHEMA = 'app_day27';
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);
const fail = (title, hint = '') => {
  out(`\n❌ ${title}${hint ? `\n${hint}` : ''}`);
  process.exit(1);
};
const verdicts = [];
const check = (label, ok) => {
  verdicts.push([label, ok]);
  out(`${ok ? '✅' : '❌'} ${label}`);
};

// ---------- 子进程模式:用内存版仓储发同一个 PATCH(第 6 幕用) ----------
if (process.argv.includes('--memory-patch-null')) {
  Object.assign(process.env, { TASKS_STORAGE: 'memory', LOG_REQUESTS: 'false', PORT: '0' });
  console.log = () => {};
  const { createApp } = await import('../dist/app.factory.js');
  const app = await createApp(undefined, { logger: false });
  await app.listen(0, '127.0.0.1');
  const res = await fetch(`http://127.0.0.1:${app.getHttpServer().address().port}/v2/tasks/2`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'x-demo-key': 'let-me-in' },
    body: JSON.stringify({ title: null }),
  });
  process.stdout.write(JSON.stringify({ status: res.status, body: await res.json() }));
  await app.close();
  process.exit(0);
}

// ---------- 第 0 幕:准备数据库 ----------
line('第 0 幕:准备数据库');
const reset = spawnSync(process.execPath, ['scripts/db-reset.mjs', '--schema', SCHEMA], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, DATABASE_URL } });
if (reset.status !== 0) fail('数据库没准备好', (reset.stdout + reset.stderr).trim());
out(reset.stdout.trim());
const demoSql = () =>
  spawnSync('psql', ['-w', '-X', '-q', '-f', 'sql/day27/01-injection-demo.sql', DATABASE_URL], { cwd: ROOT, encoding: 'utf8' });
if (demoSql().status !== 0) fail('建 day27_demo 失败');
out('✅ SQL 注入实验用的 day27_demo.notes / day27_demo.api_keys 已重建');

// 必须在 import 应用代码之前设好:ConfigModule 在模块加载时就读取并校验环境变量
Object.assign(process.env, {
  NODE_ENV: 'development',
  TASKS_STORAGE: 'postgres',
  DATABASE_URL,
  DATABASE_SCHEMA: SCHEMA,
  DB_POOL_MAX: '5',
  DB_RESET_ON_START: 'true',
  LOG_REQUESTS: 'false',
});
console.log = () => {};
const pg = (await import('pg')).default;
const { createApp } = await import('../dist/app.factory.js');
const { DbDemoAppModule } = await import('../dist/db-demo/db-demo.module.js');
const { TasksService } = await import('../dist/tasks/tasks.service.js');
const { TASKS_REPOSITORY } = await import('../dist/tasks/tasks.repository.js');
const { keysetCondition } = await import('../dist/tasks/pg-tasks.repository.js');

const app = await createApp(DbDemoAppModule, { logger: false });
await app.listen(0, '127.0.0.1');
const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
const KEY = { 'x-demo-key': 'let-me-in' };
const http = async (method, path, body, headers = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...KEY, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
};
// 一个独立的客户端,站在旁边看数据库(不占应用的连接池)
const observer = new pg.Client({ connectionString: DATABASE_URL, application_name: 'day27-observer' });
await observer.connect();
const count = async (sql) => Number((await observer.query(sql)).rows[0].count);
out(`仓储实现:${app.get(TASKS_REPOSITORY).constructor.name}(schema ${SCHEMA},连接池上限 DB_POOL_MAX=5)`);

// ---------- 第 1 幕:连接池 ----------
line('第 1 幕:20 个请求同时到达,每个占用连接 300 ms;池子最多 5 个连接');
let maxSeen = 0;
let sampling = true;
const sampler = (async () => {
  while (sampling) {
    maxSeen = Math.max(maxSeen, await count("SELECT count(*) FROM pg_stat_activity WHERE application_name = 'nest-lab'"));
    await new Promise((r) => setTimeout(r, 30));
  }
})();
const t0 = Date.now();
const slow = await Promise.all(Array.from({ length: 20 }, () => http('GET', '/demo/slow?ms=300')));
const elapsed = Date.now() - t0;
sampling = false;
await sampler;
const pids = new Set(slow.map((r) => r.body.pid));
out(`20 个请求全部返回:${slow.every((r) => r.status === 200) ? '是' : '否'},总用时 ${elapsed} ms(串行要 6000 ms,不限连接数约 300 ms)`);
out(`它们一共用到了 ${pids.size} 个不同的后端进程:${[...pids].sort((a, b) => a - b).join(', ')}`);
out(`观察期间 pg_stat_activity 里 nest-lab 的连接数最多是 ${maxSeen}`);
check('并发 20 个请求时,连接数始终不超过池大小 5', maxSeen <= 5 && pids.size <= 5);
await new Promise((r) => setTimeout(r, 200));
out(`请求结束后,池子里还留着 ${await count("SELECT count(*) FROM pg_stat_activity WHERE application_name = 'nest-lab'")} 个空闲连接(idleTimeoutMillis=10000,空闲 10 秒才关)`);

// ---------- 第 2 幕:SQL 注入 ----------
line('第 2 幕:SQL 注入 —— 拼接字符串 vs 参数化');
const payloads = [
  ['正常搜索', 'SQL'],
  ['永真条件', "' OR 1=1 --"],
  ['UNION 偷别的表', "' UNION SELECT id, secret FROM day27_demo.api_keys --"],
  ['多语句:删表', "'; DROP TABLE day27_demo.api_keys; --"],
];
for (const [label, q] of payloads) {
  const r = await http('GET', `/demo/notes/unsafe?q=${encodeURIComponent(q)}`);
  out(`\n❌ 拼接 · ${label}:q = ${q}`);
  if (r.status !== 200) {
    out(`   → ${r.status} ${r.body?.title}`);
    continue;
  }
  out(`   实际执行的 SQL:${r.body.sql}`);
  for (const s of r.body.statements) out(`   → ${s.command}:${JSON.stringify(s.rows)}`);
}
const tableLeft = await count("SELECT count(*) FROM pg_tables WHERE schemaname = 'day27_demo' AND tablename = 'api_keys'");
out(`\n多语句注入之后,day27_demo.api_keys 还在吗?${tableLeft ? '在' : '不在了'}`);
check('拼接字符串:永真条件读到了 Bob 的笔记,UNION 读到了密钥,多语句删掉了整张表', tableLeft === 0);
demoSql(); // 把被删的表重建回来,再试参数化版本
for (const [label, q] of payloads) {
  const r = await http('GET', `/demo/notes/safe?q=${encodeURIComponent(q)}`);
  out(`\n✅ 参数化 · ${label}:q = ${q}`);
  out(`   SQL 文本永远是:${r.body.sql}`);
  out(`   → ${r.status}:${JSON.stringify(r.body.rows)}`);
}
check(
  '参数化:同样四个输入,都只是被当成「要搜的文字」',
  (await count("SELECT count(*) FROM pg_tables WHERE schemaname = 'day27_demo' AND tablename = 'api_keys'")) === 1,
);
// 带参数的查询走「扩展查询协议」:一段 SQL 只能是一条语句
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
try {
  await pool.query('SELECT $1::int AS a; DROP TABLE day27_demo.api_keys', [1]);
} catch (err) {
  out(`\n带参数时塞两条语句:${err.code} ${err.message}`);
}
await pool.end();

// ---------- 第 3 幕:CRUD 全流程(PG 版) ----------
line('第 3 幕:CRUD 全流程,数据真的进了 PostgreSQL');
const created = await http('POST', '/v2/tasks', { title: '接上 PostgreSQL', checklist: [{ text: '装 pg', done: true }, { text: '写仓储', done: false }] });
out(`POST   /v2/tasks      → ${created.status},Location: ${created.headers.get('location')}`);
out(`       ${JSON.stringify(created.body)}`);
const id = created.body.id;
out(`       数据库里:tasks 有 ${await count(`SELECT count(*) FROM ${SCHEMA}.tasks WHERE id = ${id}`)} 行,checklist_items 有 ${await count(`SELECT count(*) FROM ${SCHEMA}.checklist_items WHERE task_id = ${id}`)} 行`);
const patched = await http('PATCH', `/v2/tasks/${id}`, { done: true, checklist: [{ text: '全部完成', done: true }] });
out(`PATCH  /v2/tasks/${id}    → ${patched.status} ${JSON.stringify(patched.body)}`);
const put = await http('PUT', `/v2/tasks/${id}`, { title: '已完成的任务改标题', done: true });
out(`PUT    /v2/tasks/${id}    → ${put.status} ${put.body.type}(Day 15 的 409 规则照样生效)`);
const del = await http('DELETE', `/v2/tasks/${id}`, null, { 'x-demo-role': 'admin' });
out(`DELETE /v2/tasks/${id}    → ${del.status};清单项还剩 ${await count(`SELECT count(*) FROM ${SCHEMA}.checklist_items WHERE task_id = ${id}`)} 行(ON DELETE CASCADE)`);
const del2 = await http('DELETE', `/v2/tasks/${id}`, null, { 'x-demo-role': 'admin' });
out(`DELETE /v2/tasks/${id}    → ${del2.status} ${del2.body.type}`);
check('201 + Location → PATCH 200 → PUT 409 → DELETE 204 → 再删 404', created.status === 201 && patched.status === 200 && put.status === 409 && del.status === 204 && del2.status === 404);

// ---------- 第 4 幕:事务与约束 ----------
line('第 4 幕:绕过 DTO 写入坏数据 —— 数据库约束兜底,事务保证不留半份');
const before = await count(`SELECT count(*) FROM ${SCHEMA}.tasks`);
const blank = await http('POST', '/demo/raw-tasks', { title: '   ', done: false, checklist: [] });
out(`标题全是空格     → ${blank.status} ${JSON.stringify(blank.body)}`);
const half = await http('POST', '/demo/raw-tasks', {
  title: '带一个坏清单项的任务',
  done: false,
  checklist: [{ text: '好的一项', done: false }, { text: '   ', done: false }],
});
out(`第二个清单项是空的 → ${half.status} ${JSON.stringify(half.body)}`);
const after = await count(`SELECT count(*) FROM ${SCHEMA}.tasks`);
const orphan = await count(`SELECT count(*) FROM ${SCHEMA}.tasks WHERE title = '带一个坏清单项的任务'`);
out(`任务总数:之前 ${before},之后 ${after};「带一个坏清单项的任务」在库里有 ${orphan} 行`);
const leaked = JSON.stringify([blank.body, half.body]);
check('约束违反 → 422 problem+json,pointer 指到字段', blank.status === 422 && blank.body.errors?.[0]?.pointer === '#/title' && half.status === 422);
check('第二张表写失败时,第一张表的 INSERT 也被回滚了', after === before && orphan === 0);
check('响应里没有 PG 原文(表名、约束名、SQLSTATE)', !/tasks_title_check|checklist_items|violates|23514/.test(leaked));

// ---------- 第 5 幕:keyset 分页的真实 SQL ----------
line('第 5 幕:keyset 分页写成真实 SQL,翻页途中增删也不重不漏');
const tasks = app.get(TasksService);
for (let i = 1; i <= 40; i++) await tasks.create({ title: `第 ${String(i).padStart(2, '0')} 条` });
const param = (() => {
  let n = 0;
  return () => `$${++n}`;
})();
out('sort=-id(方向一致)  →', keysetCondition([{ field: 'id', dir: 'desc' }], [37], param));
out(
  'sort=-createdAt,title(方向混合)→',
  keysetCondition(
    [
      { field: 'createdAt', dir: 'desc' },
      { field: 'title', dir: 'asc' },
      { field: 'id', dir: 'asc' },
    ],
    ['2026-01-01T00:00:00.000Z', 'x', 1],
    (() => {
      let n = 0;
      return () => `$${++n}`;
    })(),
  ),
);
for (const sort of ['-id', '-createdAt,title']) {
  const total = (await http('GET', `/v2/tasks?limit=100`)).body.items.length;
  const seen = [];
  let cursor = null;
  let pages = 0;
  let mutated = false;
  do {
    const r = await http('GET', `/v2/tasks?sort=${sort}&limit=7${cursor ? `&cursor=${cursor}` : ''}`);
    seen.push(...r.body.items.map((t) => t.id));
    cursor = r.body.nextCursor;
    pages++;
    if (pages === 2 && !mutated) {
      // 翻到第 2 页时,别人新建了一条(新任务排在最前面,已经翻过去了)
      await tasks.create({ title: '翻页途中新建的' });
      mutated = true;
    }
  } while (cursor);
  out(`sort=${sort.padEnd(16)} 每页 7 条:${pages} 页,看到 ${seen.length} 条,去重 ${new Set(seen).size} 条,翻页开始时共 ${total} 条`);
  check(`sort=${sort}:不重复、不遗漏(途中新建的那条排在已翻过的位置,不会出现)`, seen.length === total && new Set(seen).size === total);
}

// ---------- 第 6 幕:同一个请求,内存版和 PG 版不一样 ----------
line('第 6 幕:PATCH {"title": null} —— DTO 漏掉的 null');
const pgNull = await http('PATCH', '/v2/tasks/2', { title: null });
const mem = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--memory-patch-null'], { cwd: ROOT, encoding: 'utf8' });
const memNull = JSON.parse(mem.stdout);
out(`内存版 → ${memNull.status} ${JSON.stringify(memNull.body)}`);
out(`PG 版  → ${pgNull.status} ${JSON.stringify(pgNull.body)}`);
check('PG 版被 NOT NULL 约束拦下(内存版把标题改成了 null)', pgNull.status === 422 && memNull.status === 200);

await observer.end();
await app.close();

// ---------- 第 7 幕:配置错了,启动就失败 ----------
line('第 7 幕:fail fast —— 配置缺失 / 数据库连不上');
const MAIN = fileURLToPath(new URL('../dist/main.js', import.meta.url));
const boot = (extra) =>
  new Promise((resolve) => {
    const env = { PATH: process.env.PATH, NO_COLOR: '1', NODE_ENV: 'development', PORT: '0', TASKS_STORAGE: 'postgres', ...extra };
    const child = spawn(process.execPath, [MAIN], { cwd: '/tmp', env });
    let text = '';
    child.stdout.on('data', (c) => (text += c));
    child.stderr.on('data', (c) => (text += c));
    const timer = setTimeout(() => child.kill('SIGTERM'), 8000);
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ code, text });
    });
  });
const noUrl = await boot({});
out(`TASKS_STORAGE=postgres,不设 DATABASE_URL → 退出码 ${noUrl.code}`);
out(noUrl.text.split('\n').filter((l) => l.includes('环境变量校验失败') || l.startsWith('  - ')).map((l) => l.replace(/^.*ERROR/, 'ERROR')).join('\n'));
const badPort = await boot({ DATABASE_URL: 'postgresql://nest_lab:nest_lab_dev@localhost:5999/nest_lab' });
out(`DATABASE_URL 指向一个没人监听的端口 → 退出码 ${badPort.code}`);
out(badPort.text.split('\n').filter((l) => l.startsWith('Error:')).slice(0, 1).join('\n'));
check('两种情况都在启动阶段就退出(退出码不是 0)', noUrl.code !== 0 && badPort.code !== 0);

line('结论');
const passed = verdicts.filter(([, ok]) => ok).length;
out(`${passed} / ${verdicts.length} 项符合预期`);
