// Day 13 观察脚本:并发请求的日志交错 + ALS 桌号牌把它们归好组。
//
// 跑:npm run day13   (= nest build + node scripts/day13-try.mjs)
const print = console.log.bind(console);
const captured = [];
console.log = (...args) => captured.push(args.join(' ')); // 先把服务端日志收起来,稍后两种方式展示

const { Module } = await import('@nestjs/common');
// Day 19:统一用 createApp()(= NestFactory.create + configureApp,开启 URI 版本化)
const { createApp } = await import('../dist/app.factory.js');
const { AppModule } = await import('../dist/app.module.js');
const { KitchenModule } = await import('../dist/request-context-demo/kitchen.module.js');

const line = (title) => print(`\n========== ${title} ==========`);
class Day13Module {}
Module({ imports: [AppModule, KitchenModule] })(Day13Module);

const app = await createApp(Day13Module, { logger: false });
await app.listen(0, '127.0.0.1');
const { port } = app.getHttpServer().address();
const base = `http://127.0.0.1:${port}`;

// ---------- 第 1 幕:5 个请求同时到达,各自在 Service 里 await 不同的时间 ----------
const delays = [120, 20, 80, 40, 60]; // 固定的「随机」延迟,保证每次运行结论一致
captured.length = 0;
const results = await Promise.all(
  delays.map(async (ms, i) => {
    const sent = `req-${i + 1}`;
    const res = await fetch(`${base}/kitchen/cook?ms=${ms}`, { headers: { 'x-request-id': sent } });
    return { sent, ms, header: res.headers.get('x-request-id'), body: await res.json() };
  }),
);
const logs = [...captured];

line('第 1 幕-A:同样的日志,去掉桌号以后(你平时看到的样子)');
for (const l of logs) print(l.replace(/^\[[^\]]+\] /, ''));

line('第 1 幕-B:带桌号的原始日志');
for (const l of logs) print(l);

line('第 1 幕-C:按桌号归组 + 自动校验');
const expected = [
  '→ ① Middleware 进门:GET /kitchen/cook',
  '②-1 Guard',
  '②-2 Interceptor(前)',
  '③ Controller 前台接单',
  '④ Kitchen 开始做菜',
  '④ Kitchen 查完库存',
  '④ Kitchen 出菜',
  '⑤-1 Interceptor(后)',
  '← ⑥ Middleware 出门:200',
];
let allOk = true;
for (const r of results) {
  const tag = r.sent.padEnd(8);
  const mine = logs.filter((l) => l.startsWith(`[${tag}]`)).map((l) => l.slice(11).trim());
  const orderOk = mine.length === expected.length && expected.every((e, i) => mine[i].includes(e.replace(/^[→←] /, '')));
  const echoOk = r.header === r.sent && r.body.requestId === r.sent;
  allOk &&= orderOk && echoOk;
  print(
    `${r.sent}(等 ${String(r.ms).padStart(3)} ms):${mine.length} 行日志,顺序${orderOk ? '✅ 完整' : '❌ 不对'}` +
      ` | 响应头 x-request-id=${r.header} | Service 深处拿到 requestId=${r.body.requestId} ${echoOk ? '✅' : '❌'}`,
  );
}
const untagged = logs.filter((l) => l.startsWith('[--------]')).length;
print(`没有桌号的日志行:${untagged}`);
print(`结论:${allOk && untagged === 0 ? '✅ 5 个并发请求的 45 行日志全部归组正确,Service 没有接收任何 requestId 参数' : '❌ 有日志没能正确归组'}`);

// ---------- 第 2 幕:反面教材 —— 单例字段存 requestId ----------
line('第 2 幕:BadKitchenService 把 requestId 存在单例字段上(3 个并发请求)');
captured.length = 0;
const bad = await Promise.all(
  [90, 30, 60].map(async (ms, i) => {
    const sent = `bad-${i + 1}`;
    const res = await fetch(`${base}/kitchen/bad?ms=${ms}`, { headers: { 'x-request-id': sent } });
    return { sent, ms, ...(await res.json()) };
  }),
);
for (const b of bad) {
  print(
    `${b.sent}(等 ${b.ms} ms):字段里读到 ${b.fieldSays} ${b.fieldSays === b.sent ? '✅' : '❌ 串号了'} | ALS 读到 ${b.alsSays} ${b.alsSays === b.sent ? '✅' : '❌'}`,
  );
}

// ---------- 第 3 幕:没带 x-request-id / 出错时 ----------
line('第 3 幕:不带 x-request-id 的 404(APP_FILTER 注入了 RequestContextService)');
captured.length = 0;
const res = await fetch(`${base}/tasks/999`);
const generated = res.headers.get('x-request-id');
const body = await res.json();
print('响应头 x-request-id:', generated);
print('错误体:', JSON.stringify(body));
print('错误体里的 requestId 和响应头一致吗?', body.requestId === generated ? '✅ 一致' : '❌ 不一致');
for (const l of captured) print(l);

await app.close();
print('\n店已关,进程退出');
