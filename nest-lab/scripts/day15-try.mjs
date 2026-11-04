// Day 15 观察脚本:每个 HTTP 方法打一遍,看状态码和关键响应头。
//
// 跑:npm run day15   (= nest build + node scripts/day15-try.mjs)
// 服务端的站点日志这里先关掉(只看「客户端看到了什么」),想看就把下面那行删掉。
console.log = () => {};
const print = process.stdout.write.bind(process.stdout);
const out = (...a) => print(a.join(' ') + '\n');

const { NestFactory } = await import('@nestjs/core');
const { AppModule } = await import('../dist/app.module.js');

const app = await NestFactory.create(AppModule, { logger: false });
await app.listen(0, '127.0.0.1');
const { port } = app.getHttpServer().address();
const base = `http://127.0.0.1:${port}`;

const KEY = { 'x-demo-key': 'let-me-in' };
const JSON_BODY = { 'content-type': 'application/json' };
const line = (title) => out(`\n========== ${title} ==========`);

async function call(label, method, path, { headers = {}, body, raw } = {}) {
  const res = await fetch(base + path, {
    method,
    headers,
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  const pick = ['location', 'allow', 'content-type']
    .map((h) => (res.headers.get(h) ? `${h}: ${res.headers.get(h)}` : null))
    .filter(Boolean)
    .join(' | ');
  out(`${label.padEnd(44)} → ${res.status} ${res.statusText}${pick ? `  [${pick}]` : ''}`);
  if (text) out(`${''.padEnd(47)}${text.length > 150 ? text.slice(0, 150) + '…' : text}`);
  return text ? JSON.parse(text) : undefined;
}

line('第 1 幕:每个方法一遍(资源 /tasks 与 /tasks/:id)');
await call('GET    /tasks', 'GET', '/tasks');
await call('GET    /tasks/2', 'GET', '/tasks/2');
await call('POST   /tasks {title}', 'POST', '/tasks', { headers: { ...KEY, ...JSON_BODY }, body: { title: '学 REST' } });
await call('PUT    /tasks/2 {title, done}', 'PUT', '/tasks/2', { headers: { ...KEY, ...JSON_BODY }, body: { title: '看懂三件套(改)', done: true } });
await call('PATCH  /tasks/3 {done:true}', 'PATCH', '/tasks/3', { headers: { ...KEY, ...JSON_BODY }, body: { done: true } });
await call('DELETE /tasks/3(admin)', 'DELETE', '/tasks/3', { headers: { ...KEY, 'x-demo-role': 'admin' } });
await call('DELETE /tasks/3 再删一次(admin)', 'DELETE', '/tasks/3', { headers: { ...KEY, 'x-demo-role': 'admin' } });
await call('HEAD   /tasks/1', 'HEAD', '/tasks/1');
await call('OPTIONS /tasks/1', 'OPTIONS', '/tasks/1');

line('第 2 幕:PUT vs PATCH 对同一个资源(先把任务 1 准备成 done=true)');
await call('GET    /tasks/1(改之前)', 'GET', '/tasks/1');
await call('PATCH  /tasks/1 {title} 只给标题', 'PATCH', '/tasks/1', { headers: { ...KEY, ...JSON_BODY }, body: { title: '新标题' } });
await call('PATCH  /tasks/1 {title, done:false}', 'PATCH', '/tasks/1', { headers: { ...KEY, ...JSON_BODY }, body: { title: 'PATCH 后的标题', done: false } });
await call('PATCH  /tasks/1 {done:true} 只改状态', 'PATCH', '/tasks/1', { headers: { ...KEY, ...JSON_BODY }, body: { done: true } });
await call('PUT    /tasks/1 {title} 缺 done', 'PUT', '/tasks/1', { headers: { ...KEY, ...JSON_BODY }, body: { title: 'PUT 的标题' } });
await call('PUT    /tasks/1 {title, done:false}', 'PUT', '/tasks/1', { headers: { ...KEY, ...JSON_BODY }, body: { title: 'PUT 的标题', done: false } });
await call('PUT    /tasks/1 同一请求再发一次', 'PUT', '/tasks/1', { headers: { ...KEY, ...JSON_BODY }, body: { title: 'PUT 的标题', done: false } });
await call('PUT    /tasks/999(不存在)', 'PUT', '/tasks/999', { headers: { ...KEY, ...JSON_BODY }, body: { title: 'x', done: false } });

line('第 3 幕:POST 不幂等 —— 同一个请求发两次');
// Day 18 起成功响应不再包装 { data, timestamp },响应体就是资源本身
const before = (await (await fetch(`${base}/tasks`)).json()).length;
const a = await call('POST   /tasks {title:"买牛奶"} 第 1 次', 'POST', '/tasks', { headers: { ...KEY, ...JSON_BODY }, body: { title: '买牛奶' } });
const b = await call('POST   /tasks {title:"买牛奶"} 第 2 次', 'POST', '/tasks', { headers: { ...KEY, ...JSON_BODY }, body: { title: '买牛奶' } });
const after = (await (await fetch(`${base}/tasks`)).json()).length;
out(`任务数:${before} → ${after};两次拿到的 id:${a.id} 和 ${b.id}(用户手一抖点了两下,就多了一条)`);

line('第 4 幕:405 / 406 / 415 / 400');
await call('PATCH  /tasks(集合不支持 PATCH)', 'PATCH', '/tasks', { headers: KEY });
await call('DELETE /tasks(集合不支持 DELETE)', 'DELETE', '/tasks', { headers: KEY });
await call('GET    /tasks/1  Accept: application/xml', 'GET', '/tasks/1', { headers: { accept: 'application/xml' } });
await call('GET    /tasks/1  Accept: application/xml, */*;q=0.1', 'GET', '/tasks/1', { headers: { accept: 'application/xml, */*;q=0.1' } });
await call('POST   /tasks  Content-Type: text/plain', 'POST', '/tasks', { headers: { ...KEY, 'content-type': 'text/plain' }, raw: 'hello' });
await call('POST   /tasks  没有请求体', 'POST', '/tasks', { headers: KEY });
await call('POST   /tasks  {title: ""}', 'POST', '/tasks', { headers: { ...KEY, ...JSON_BODY }, body: { title: '' } });
await call('PATCH  /tasks/2  {}', 'PATCH', '/tasks/2', { headers: { ...KEY, ...JSON_BODY }, body: {} });

await app.close();
out('\n店已关,进程退出');
