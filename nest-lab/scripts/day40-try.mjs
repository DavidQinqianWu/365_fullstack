// Day 40 观察脚本:乐观锁 vs 悲观锁。
//   第 1–2 幕:纯 SQL —— 丢失更新、带版本号的写(UPDATE 0)、SELECT … FOR NO KEY UPDATE 让第二个人排队并读到最新值
//   第 3–5 幕:nest-lab 真实代码(dist)—— 修之前 / 乐观锁 / 悲观锁 三种写法在同一组并发场景下的结果和耗时
//   第 6 幕:内存仓储也有同样的竞态(插队发生在 await 上)
//
// 跑:npm run day40   # 先 nest build,本机约 5 秒
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// 用到两个独立的 schema:day40(第 1–2 幕的小表)、day40_app(nest-lab 的表结构);每次运行都先删掉重建,不碰 app 和 app_test。
// 每个连接都设了 statement_timeout = 10s 兜底。
//
// 「修之前」的写法(Day 39 以前 TasksService.update 的样子:读 → 判断 → 无条件写)只在这个脚本里保留一份,
// 用 repo.update(id, changes) 不传 expectedVersion 实现 —— 应用代码里已经没有这条路径了。
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
  PGAPPNAME: 'day40',
};
const URL_ = `postgresql://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`;
const write = (s) => process.stdout.write(s);
const out = (...a) => write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);
const fail = (title, hint) => {
  out(`\n❌ ${title}\n${hint}`);
  process.exit(1);
};
const PSQL = 'psql -w -X "$@" 2>&1';
const run = (args) => spawnSync('sh', ['-c', PSQL, 'sh', ...args], { cwd: ROOT, env, encoding: 'utf8', timeout: 60_000 });
const runFile = (f) => {
  const r = run(['-f', `sql/day40/${f}`]);
  if (r.status !== 0 || /ERROR/.test(r.stdout)) fail(`${f} 执行失败`, r.stdout);
  out(
    r.stdout
      .split('\n')
      .filter((l) => !/^(SET|DROP SCHEMA|CREATE SCHEMA|CREATE TABLE|INSERT 0 \d+)$/.test(l))
      .join('\n')
      .trimEnd(),
  );
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();

// TasksService 里的 ctxLog 会往 console.log 打「后厨做菜」的日志;脚本自己的输出走 process.stdout,这里把它静音
console.log = () => {};

// ---------- 第 0 幕:数据库在不在、dist 在不在 ----------
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
const dist = (p) => new URL(`../dist/${p}`, import.meta.url).href;
let mods;
try {
  mods = {
    ...(await import(dist('tasks/pg-tasks.repository.js'))),
    ...(await import(dist('tasks/in-memory-tasks.repository.js'))),
    ...(await import(dist('tasks/tasks.service.js'))),
    ...(await import(dist('database/with-retry.js'))),
  };
} catch (err) {
  fail('读不到 dist/ 里的编译结果', `  请用 npm run day40 运行(它会先 nest build)。\n  ${err.message}`);
}
const { PgTasksRepository, InMemoryTasksRepository, TasksService, assertCanChange, withRetry } = mods;
const { default: pg } = await import('pg');
const connect = async (name) => {
  const c = new pg.Client({ connectionString: URL_, options: '-c search_path=day40 -c statement_timeout=10s', application_name: name });
  c.on('error', () => {});
  await c.connect();
  return c;
};

// ---------- 第 1 幕:纯 SQL 的丢失更新 ----------
line('第 1 幕:丢失更新,和「带版本号的写」(01-lost-update.sql)');
runFile('01-lost-update.sql');

// ---------- 第 2 幕:悲观锁 ----------
line('第 2 幕:悲观锁 —— 第二个人排队,而且排到时读到的是最新值(02-pessimistic.sql 有手动步骤)');
runFile('02-pessimistic.sql');
{
  const a = await connect('A');
  const b = await connect('B');
  await a.query('BEGIN');
  const ar = (await a.query('SELECT done, version FROM tasks WHERE id = 3 FOR NO KEY UPDATE')).rows[0];
  out(`  A:BEGIN; SELECT … FOR NO KEY UPDATE → done = ${ar.done}, version = ${ar.version}(压上镇纸)`);
  const plain = (await b.query('SELECT done, version FROM tasks WHERE id = 3')).rows[0];
  out(`  B:普通 SELECT(不加锁)→ 立刻返回 done = ${plain.done}, version = ${plain.version}(行锁不挡读,读到的是 A 提交前的值)`);
  await b.query('BEGIN');
  const nowait = await b.query('SELECT 1 FROM tasks WHERE id = 3 FOR NO KEY UPDATE NOWAIT').catch((e) => e);
  out(`  B:SELECT … FOR NO KEY UPDATE NOWAIT → ERROR ${nowait.code} ${nowait.message}`);
  await b.query('ROLLBACK');
  await b.query('BEGIN');
  const t = performance.now();
  const waiting = b.query('SELECT done, version FROM tasks WHERE id = 3 FOR NO KEY UPDATE');
  out('  B:BEGIN; SELECT … FOR NO KEY UPDATE → 卡住,在等 A');
  await sleep(300);
  await a.query('UPDATE tasks SET done = true, version = version + 1 WHERE id = 3');
  await a.query('COMMIT');
  out('  A:(300 ms 后)UPDATE … SET done = true, version = version + 1; COMMIT');
  const br = (await waiting).rows[0];
  out(`  B:这时才返回(等了 ${(performance.now() - t).toFixed(0)} ms),读到 done = ${br.done}, version = ${br.version} —— 是 A 提交之后的最新值`);
  out('     → B 基于最新状态判断:任务已完成,不允许改标题 → ROLLBACK。没有「基于旧快照做判断」的机会');
  await b.query('ROLLBACK');
  await a.end();
  await b.end();
}

// ---------- 准备 nest-lab 的表结构(schema day40_app) ----------
const reset = spawnSync(process.execPath, ['scripts/db-reset.mjs', '--schema', 'day40_app'], {
  cwd: ROOT,
  env: { ...process.env, DATABASE_URL: URL_ },
  encoding: 'utf8',
});
if (reset.status !== 0) fail('建 schema day40_app 失败', reset.stdout + reset.stderr);
const pool = new pg.Pool({ connectionString: URL_, max: 10, options: '-c search_path=day40_app -c statement_timeout=10s' });
pool.on('error', () => {});
const pgRepo = new PgTasksRepository(pool);
const clock = { now: () => new Date() };

// 「读完之后过一会儿才写」:给 findById 加一段延迟,模拟读和写之间的网络往返、别的 await(真实系统里几毫秒到几十毫秒)。
// 用 Proxy 包一层,repo 内部(updateLocked 里在锁内调用的 this.findById)也会走到这段延迟 —— 锁因此被持有得更久,这也是真实代价
const withReadDelay = (repo, delayMs) =>
  new Proxy(repo, {
    get(target, prop, receiver) {
      if (prop === 'findById') {
        return async (...args) => {
          const task = await target.findById(...args);
          await sleep(delayMs);
          return task;
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });

// 三种写法,同一个签名:patch(id, { title?, done? }) → 写入之后的任务
const changesOf = (patch) => Object.fromEntries(['title', 'done', 'checklist'].filter((k) => patch[k] !== undefined).map((k) => [k, patch[k]]));
const strategies = (repo) => ({
  // Day 39 以前的 TasksService.update:读 → 判断 → 无条件写
  修之前: async (id, patch) => {
    const current = await repo.findById(id);
    if (!current) throw Object.assign(new Error('404'), { status: 404 });
    assertCanChange(current, patch);
    return (await repo.update(id, changesOf(patch))).task; // 不传 expectedVersion = 无条件覆盖
  },
  // Day 40 的主线:真实的 TasksService(读 → 判断 → 带版本号写;版本变了就整轮重做)
  乐观锁: (() => {
    const service = new TasksService(repo, clock);
    return (id, patch) => service.update(id, patch);
  })(),
  // 悲观锁:先锁行,锁内读最新值、判断、写
  悲观锁: async (id, patch) => {
    const task = await repo.updateLocked(id, (current) => {
      assertCanChange(current, patch);
      return changesOf(patch);
    });
    if (!task) throw Object.assign(new Error('404'), { status: 404 });
    return task;
  },
});
// 结果:{ status: 200, task } 或 { status: 'conflict/…' }
const outcome = async (p) => {
  try {
    return { status: 200, task: await p };
  } catch (err) {
    return { status: err.problemType?.type?.split('/problems/')[1] ?? err.status ?? err.message };
  }
};

// 一次试验:先发「标成已完成」,隔 staggerMs 再发「改标题」(两个都在对方写之前读完 → 修之前必然出事)。
// 违反规则 = 「改标题」这次写入之后的任务是已完成的 —— 标题是在任务已经完成之后被改的。
// (注意:最后看到「已完成 + 新标题」本身不一定违规:先改名、后完成也是这个结局,而且完全合法)
const race = async (repo, patch, staggerMs) => {
  const task = await create(repo, '原标题');
  const finishing = outcome(patch(task.id, { done: true }));
  if (staggerMs) await sleep(staggerMs);
  const rename = await outcome(patch(task.id, { title: '偷偷改名' }));
  const finish = await finishing;
  return { rename, finish, bad: rename.status === 200 && rename.task.done === true };
};
const create = (repo, title, done = false) => repo.insert({ title, done, checklist: [], createdAt: new Date().toISOString() });

// ---------- 第 3 幕:同一个请求内部的竞态 —— 绕过业务规则 ----------
line('第 3 幕:「标成已完成」和「改标题」几乎同时到达(读和写之间隔 20 ms,改标题晚 5 ms 发出),各跑 20 次');
out('  规则(Day 15):已完成的任务不能改标题。两个请求单独看都合规;合法的结局只有两种:');
out('  先改名后完成(两个都 200),或者先完成、改名被拒(409 conflict/task-completed)。违规 = 改标题写在了「已完成」之后');
const TRIALS = 20;
const summary = {};
for (const [name, patch] of Object.entries(strategies(withReadDelay(pgRepo, 20)))) {
  const tally = {};
  let bad = 0;
  const t = performance.now();
  for (let i = 0; i < TRIALS; i++) {
    const r = await race(pgRepo, patch, 5);
    if (r.bad) bad++;
    const key = `完成 ${r.finish.status} / 改名 ${r.rename.status}${r.bad ? '(改名时任务已完成!)' : ''}`;
    tally[key] = (tally[key] ?? 0) + 1;
  }
  const elapsed = performance.now() - t;
  summary[name] = { bad, elapsed };
  out(`  ${name}:违规 ${bad} / ${TRIALS},总耗时 ${elapsed.toFixed(0)} ms`);
  for (const [k, v] of Object.entries(tally)) out(`      ${k} × ${v}`);
}
out('  修之前:两个请求都读到「未完成」,都通过了判断,然后各写各的 —— 改名写在了「已完成」之后');
out('  乐观锁:后写的那个发现版本变了(UPDATE 0 行),整轮重做;重新读到「已完成」→ 409。没给 version 的请求由服务器替它重做');
out('  悲观锁:第二个请求在 FOR NO KEY UPDATE 上排队,排到时读到的已经是最新值');

// ---------- 第 4 幕:跨请求的丢失更新 —— 只有客户端带着版本号来才能发现 ----------
line('第 4 幕:跨请求 —— 两个人先后打开同一个任务,各改各的,再整份 PUT 回去');
{
  const service = new TasksService(pgRepo, clock);
  for (const withVersion of [false, true]) {
    const task = await create(pgRepo, '季度计划');
    const a = await service.findOne(task.id); // A 打开编辑页
    const b = await service.findOne(task.id); // B 也打开了
    const body = (snap, change) => ({ title: snap.title, done: snap.done, checklist: snap.checklist, ...change, ...(withVersion ? { version: snap.version } : {}) });
    const rb = (await outcome(service.replace(task.id, body(b, { done: true })))).status; // B 先保存:标成已完成
    const ra = (await outcome(service.replace(task.id, body(a, { title: '季度计划(A 改)' })))).status; // A 后保存:手里的 done 还是 false
    const final = await pgRepo.findById(task.id);
    out(`  ${withVersion ? '带 version' : '不带 version'}:B 的 PUT → ${rb},A 的 PUT → ${ra};最后 title = ${final.title}, done = ${final.done}, version = ${final.version}`);
  }
  out('  不带 version:服务器看到的是两个各自合法、先后到达的 PUT,它没法知道 A 是照着旧页面改的 —— B 的「已完成」被盖掉了。');
  out('    服务器内部的重试、悲观锁都救不了这一种:A 读页面和 A 保存是两个请求,中间隔了「人想了 5 分钟」,锁不能跨请求压着');
  out('  带 version:A 说「我是照着第 1 版改的」,服务器发现已经是第 2 版 → 409 stale-version,由 A 决定怎么合并');
}

// ---------- 第 5 幕:热点行上的代价对比 ----------
line('第 5 幕:代价 —— 50 个并发的「读计数 → +1 → 写」(连接池 10 个连接,不加人为延迟)');
{
  const bumpChanges = (current) => ({ title: `计数 ${Number(current.title.split(' ')[1]) + 1}` });
  const optimisticBump = async (id, stats) => {
    class Stale extends Error {}
    await withRetry(
      async () => {
        stats.attempts++;
        const current = await pgRepo.findById(id);
        const r = await pgRepo.update(id, bumpChanges(current), current.version);
        if (r.status === 'stale') throw new Stale();
      },
      { isRetryable: (e) => e instanceof Stale, maxAttempts: 100, baseDelayMs: 2, maxDelayMs: 50 },
    );
  };
  const N = 50;
  const ways = {
    修之前: async (id) => {
      const current = await pgRepo.findById(id);
      await pgRepo.update(id, bumpChanges(current));
    },
    乐观锁: optimisticBump,
    悲观锁: (id) => pgRepo.updateLocked(id, bumpChanges),
  };
  for (const hot of [true, false]) {
    out(hot ? '  · 50 个请求改同一行(高冲突):' : '  · 50 个请求各改各的行(无冲突):');
    for (const [name, way] of Object.entries(ways)) {
      const ids = hot ? Array(N).fill((await create(pgRepo, '计数 0')).id) : await Promise.all(Array.from({ length: N }, () => create(pgRepo, '计数 0').then((t) => t.id)));
      const stats = { attempts: 0 };
      const t = performance.now();
      await Promise.all(ids.map((id) => way(id, stats)));
      const elapsed = performance.now() - t;
      const finals = await Promise.all([...new Set(ids)].map((id) => pgRepo.findById(id)));
      const total = finals.reduce((s, f) => s + Number(f.title.split(' ')[1]), 0);
      const extra = name === '乐观锁' ? `,一共尝试 ${stats.attempts} 次(重做 ${stats.attempts - N} 次)` : '';
      out(`      ${name}:${elapsed.toFixed(0).padStart(4)} ms,计数加了 ${String(total).padStart(2)} / ${N}${extra}`);
    }
  }
  out('  高冲突:修之前丢了大部分 +1;乐观锁全对,但大量重做;悲观锁全对,大家在行锁上排队,一次就成');
  out('  无冲突:三种写法耗时接近 —— 乐观锁没有额外代价,悲观锁多一条 SELECT … FOR NO KEY UPDATE');
}
await pool.end();

// ---------- 第 6 幕:内存仓储也会被插队 ----------
line('第 6 幕:内存仓储(没有数据库、单线程)上的同一个竞态,不加任何延迟、两个请求同一时刻发出');
{
  const mem = new InMemoryTasksRepository([]);
  for (const [name, patch] of Object.entries(strategies(mem))) {
    let bad = 0;
    for (let i = 0; i < TRIALS; i++) if ((await race(mem, patch, 0)).bad) bad++;
    out(`  ${name}:违规 ${bad} / ${TRIALS}`);
  }
  out('  JS 是单线程的,但「await 读」之后函数就暂停了,另一个请求的代码会在这时跑完它的读;');
  out('  同步代码中间不会被打断(所以内存版 update 里的「检查版本 + 写」是原子的),会被插队的是 await 和 await 之间');
}

out(`\n全部完成,用时 ${((Date.now() - t0) / 1000).toFixed(1)} 秒。schema day40、day40_app 留着,可以用 psql 进去看(下次运行会重建)。`);
