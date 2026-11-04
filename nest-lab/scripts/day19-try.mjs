// Day 19 观察脚本:分页(offset vs cursor)、过滤与排序、版本化与弃用。
//
// 跑:npm run day19   (= nest build + node scripts/day19-try.mjs)
console.log = () => {}; // 关掉服务端站点日志,只看结果
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);

const { NestFactory } = await import('@nestjs/core');
const { createApp } = await import('../dist/app.factory.js');
const { AppModule } = await import('../dist/app.module.js');
const { TasksService } = await import('../dist/tasks/tasks.service.js');

const app = await createApp(AppModule, { logger: false });
await app.listen(0, '127.0.0.1');
const { port } = app.getHttpServer().address();
const base = `http://127.0.0.1:${port}`;
const tasks = app.get(TasksService);
const get = async (path, headers = {}) => {
  const res = await fetch(base + path, { headers });
  return { res, body: await res.json() };
};
const ids = (list) => list.map((t) => t.id);
const verdicts = [];
const check = (label, ok) => {
  verdicts.push([label, ok]);
  return ok;
};

// 造数据:原有 2 条 + 48 条 =50 条;每 3 条有 1 条已完成
for (let i = 3; i <= 50; i++) {
  // Day 27:Service 方法改成了 async,观察脚本跟着 await
  const t = await tasks.create({ title: `第 ${String(i).padStart(2, '0')} 条任务` });
  if (i % 3 === 0) await tasks.update(t.id, { done: true });
}
out(`造好了 ${(await tasks.listByOffset({ offset: 0, limit: 1000 })).length} 条任务`);

// ---------- 第 1 幕:offset 分页,翻页途中数据变了 ----------
line('第 1 幕:offset 分页(sort=-id,最新的在前,每页 10 条)');
const byOffset = async (offset) => ids(await tasks.listByOffset({ sort: ['-id'], offset, limit: 10 }));

let p1 = await byOffset(0);
out(`第 1 页(offset=0) :${p1.join(', ')}`);
const added = await tasks.create({ title: '翻页途中新建的任务' });
out(`…用户看第 1 页时,别人新建了一条 id=${added.id}`);
let p2 = await byOffset(10);
out(`第 2 页(offset=10):${p2.join(', ')}`);
const dup = p2.filter((id) => p1.includes(id));
out(`→ 重复出现:${dup.join(', ') || '(没有)'}`);
check('offset:中途新增导致重复', dup.length > 0);

p1 = await byOffset(0);
const expectedP2 = await byOffset(10); // 删除之前,第 2 页「本来」是这些
out(`\n第 1 页(offset=0) :${p1.join(', ')}`);
await tasks.remove(p1[0]);
out(`…用户看第 1 页时,别人删掉了 id=${p1[0]}`);
p2 = await byOffset(10);
out(`第 2 页(offset=10):${p2.join(', ')}`);
const missed = expectedP2.filter((id) => !p2.includes(id) && !p1.includes(id));
out(`→ 两页都没看到:${missed.join(', ') || '(没有)'}`);
check('offset:中途删除导致漏项', missed.length > 0);

// ---------- 第 2 幕:cursor 分页,同样的两种变化 ----------
line('第 2 幕:cursor 分页(同样 sort=-id,每页 10 条)');
let page = (await get('/v2/tasks?sort=-id&limit=10')).body;
let c1 = ids(page.items);
out(`第 1 页:${c1.join(', ')}`);
out(`nextCursor = ${page.nextCursor}`);
out(`  解开看看(只是 base64url,不是加密):${Buffer.from(page.nextCursor, 'base64url').toString()}`);
let expectedNext = await byOffset(10);
const added2 = await tasks.create({ title: '翻页途中又新建的任务' });
out(`…别人新建了一条 id=${added2.id}`);
let page2 = (await get(`/v2/tasks?sort=-id&limit=10&cursor=${page.nextCursor}`)).body;
let c2 = ids(page2.items);
out(`第 2 页:${c2.join(', ')}`);
check('cursor:中途新增也不重复', c2.every((id) => !c1.includes(id)) && c2.join() === expectedNext.join());
out(`→ 重复出现:${c2.filter((id) => c1.includes(id)).join(', ') || '(没有)'};和新增之前算好的第 2 页完全一致:${c2.join() === expectedNext.join() ? '是' : '否'}`);

page = (await get('/v2/tasks?sort=-id&limit=10')).body;
c1 = ids(page.items);
expectedNext = await byOffset(10);
out(`\n第 1 页:${c1.join(', ')}`);
await tasks.remove(c1[0]);
out(`…别人删掉了 id=${c1[0]}`);
page2 = (await get(`/v2/tasks?sort=-id&limit=10&cursor=${page.nextCursor}`)).body;
c2 = ids(page2.items);
out(`第 2 页:${c2.join(', ')}`);
const missedC = expectedNext.filter((id) => !c2.includes(id));
out(`→ 漏掉的:${missedC.join(', ') || '(没有)'}`);
check('cursor:中途删除也不漏项', missedC.length === 0);

// 一路翻到底:每条恰好出现一次
let cursor = null;
const seen = [];
let pages = 0;
do {
  const { body } = await get(`/v2/tasks?sort=-createdAt&limit=7${cursor ? `&cursor=${cursor}` : ''}`);
  seen.push(...ids(body.items));
  cursor = body.nextCursor;
  pages++;
} while (cursor);
const total = (await tasks.listByOffset({ offset: 0, limit: 1000 })).length;
out(`\nsort=-createdAt、每页 7 条一路翻到底:${pages} 页,共 ${seen.length} 条,去重后 ${new Set(seen).size} 条,当前总数 ${total}`);
check('cursor:按 createdAt(有大量相同值)翻到底不重不漏', seen.length === total && new Set(seen).size === total);

// ---------- 第 3 幕:过滤 + 排序,以及非法参数 ----------
line('第 3 幕:过滤 + 排序');
const combo = (await get('/v2/tasks?done=false&q=任务&sort=-title&limit=5')).body;
out('GET /v2/tasks?done=false&q=任务&sort=-title&limit=5');
for (const t of combo.items) out(`  id=${t.id}  done=${t.done}  ${t.title}`);
out(`  nextCursor:${combo.nextCursor ? '有(还有下一页)' : 'null'}`);
check('过滤 + 排序:全部未完成且按标题倒序', combo.items.every((t) => !t.done) && combo.items.map((t) => t.title).join() === [...combo.items.map((t) => t.title)].sort().reverse().join());

line('第 3 幕-B:非法参数 → problem+json');
const bad = async (label, path) => {
  const { res, body } = await get(path);
  out(`${label.padEnd(40)} → ${res.status} ${body.type.replace('https://nest-lab.example/problems/', '…/')}  ${JSON.stringify(body.errors ?? body.detail)}`);
  return res.status;
};
check('limit=500 → 422', (await bad('limit=500(上限 100)', '/v2/tasks?limit=500')) === 422);
check('limit=0 → 422', (await bad('limit=0', '/v2/tasks?limit=0')) === 422);
check('sort=passwordHash → 422', (await bad('sort=passwordHash(不在白名单)', '/v2/tasks?sort=passwordHash')) === 422);
check('done=yes → 422', (await bad('done=yes(只认 true / false)', '/v2/tasks?done=yes')) === 422);
check('未登记的参数 page → 422', (await bad('page=2(没有这个参数)', '/v2/tasks?page=2')) === 422);
const c = (await get('/v2/tasks?sort=-id&limit=5')).body.nextCursor;
check('换了 sort 还用旧 cursor → 400', (await bad('换了 sort 还用旧 cursor', `/v2/tasks?sort=id&limit=5&cursor=${c}`)) === 400);
check('篡改的 cursor → 400', (await bad('cursor=abc(篡改)', '/v2/tasks?cursor=abc')) === 400);

// ---------- 第 4 幕:v1 vs v2 ----------
line('第 4 幕:同一个资源,v1(已弃用)vs v2');
for (const path of ['/v1/tasks/1', '/v2/tasks/1', '/tasks/1']) {
  const { res, body } = await get(path);
  out(`GET ${path} → ${res.status}`);
  for (const h of ['deprecation', 'sunset', 'link']) if (res.headers.get(h)) out(`  ${h}: ${res.headers.get(h)}`);
  out(`  ${JSON.stringify(body)}`);
}
const v1List = (await get('/v1/tasks')).body;
const v2List = (await get('/v2/tasks')).body;
out(`\nGET /v1/tasks → 顶层字段 ${Object.keys(v1List).join(', ')};data 里 ${v1List.data.length} 条(一次全给)`);
out(`GET /v2/tasks → 顶层字段 ${Object.keys(v2List).join(', ')};items 里 ${v2List.items.length} 条(默认 limit=20)`);
check('v1 带 Deprecation / Sunset 头', (await get('/v1/tasks/1')).res.headers.get('sunset') !== null);
check('v2 不带 Deprecation 头', (await get('/v2/tasks/1')).res.headers.get('deprecation') === null);

// ---------- 第 5 幕:忘了 configureApp(没开版本化)会怎样 ----------
line('第 5 幕:直接 NestFactory.create,没有调用 configureApp');
const naked = await NestFactory.create(AppModule, { logger: false });
await naked.listen(0, '127.0.0.1');
const nakedBase = `http://127.0.0.1:${naked.getHttpServer().address().port}`;
for (const path of ['/v1/tasks/1', '/v2/tasks/1', '/tasks/1']) {
  const res = await fetch(nakedBase + path);
  const body = await res.json();
  out(`GET ${path.padEnd(12)} → ${res.status}  ${res.status === 200 ? '顶层字段 ' + Object.keys(body).join(', ') : body.detail}`);
}
await naked.close();

line('自动校验');
for (const [label, ok] of verdicts) out(`${ok ? '✅' : '❌'} ${label}`);
out(`结论:${verdicts.every(([, ok]) => ok) ? '✅ 全部符合预期' : '❌ 有不符合预期的项'}`);

await app.close();
out('\n店已关,进程退出');
