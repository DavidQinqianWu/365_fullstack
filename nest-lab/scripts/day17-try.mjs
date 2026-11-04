// Day 17 观察脚本:所有错误都走同一张「标准投诉回执单」(RFC 9457 problem+json)。
//
// 跑:npm run day17   (= nest build + node scripts/day17-try.mjs)
const logs = [];
console.log = (...a) => logs.push(a.join(' ')); // 服务端日志先收起来,只在需要时展示
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);

const { Module } = await import('@nestjs/common');
const { NestFactory } = await import('@nestjs/core');
const { AppModule } = await import('../dist/app.module.js');
const { ProblemDemoModule } = await import('../dist/problem-demo/problem-demo.module.js');

class Day17Module {}
Module({ imports: [AppModule, ProblemDemoModule] })(Day17Module);
const app = await NestFactory.create(Day17Module, { logger: false });
await app.listen(0, '127.0.0.1');
const { port } = app.getHttpServer().address();
const base = `http://127.0.0.1:${port}`;

const KEY = { 'x-demo-key': 'let-me-in' };
const JSON_CT = { 'content-type': 'application/json' };
const results = [];

async function call(label, method, path, { headers = {}, body, raw } = {}) {
  const res = await fetch(base + path, {
    method,
    headers,
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  const problem = JSON.parse(text);
  results.push({ label, res, problem, text });
  line(`${label}  →  ${res.status}  [${res.headers.get('content-type')}]`);
  out(JSON.stringify(problem, null, 2));
  return { res, problem };
}

await call('422 校验失败(字段级 errors)', 'POST', '/tasks', {
  headers: { ...KEY, ...JSON_CT },
  body: { title: '   ', id: 7, checklist: [{ text: '买菜', done: true }, { text: '', done: 'no' }] },
});
await call('400 JSON 语法错误(不带 x-request-id)', 'POST', '/tasks', { headers: { ...KEY, ...JSON_CT }, raw: '{"title": 坏掉的 json' });
await call('400 JSON 语法错误(带 x-request-id: trace-400)', 'POST', '/tasks', {
  headers: { ...KEY, ...JSON_CT, 'x-request-id': 'trace-400' },
  raw: '{bad',
});
await call('400 路径参数不是整数', 'GET', '/tasks/abc');
await call('403 没带钥匙', 'POST', '/tasks', { headers: JSON_CT, body: { title: 'x' } });
await call('404 资源不存在', 'GET', '/tasks/999');
await call('404 路由不存在', 'GET', '/nope');
await call('405 方法不支持', 'PATCH', '/tasks', { headers: KEY });
await call('406 Accept 只要 XML', 'GET', '/tasks/1', { headers: { accept: 'application/xml' } });
await call('409 已完成的任务改标题', 'PATCH', '/tasks/1', { headers: { ...KEY, ...JSON_CT }, body: { title: '改名' } });
await call('415 请求体不是 JSON', 'POST', '/tasks', { headers: { ...KEY, 'content-type': 'text/plain' }, raw: 'hello' });
await call('500 代码 bug', 'GET', '/problem-demo/boom');

// ---------- 自动校验:每一张回执单都符合同一结构 ----------
line('自动校验:12 个错误响应是否都是合格的 problem+json');
const REQUIRED = { type: 'string', title: 'string', status: 'number', detail: 'string', instance: 'string', requestId: 'string' };
let allOk = true;
for (const { label, res, problem, text } of results) {
  const problems = [];
  if (!res.headers.get('content-type')?.startsWith('application/problem+json')) problems.push('Content-Type 不对');
  for (const [k, t] of Object.entries(REQUIRED)) if (typeof problem[k] !== t) problems.push(`缺少或类型不对:${k}`);
  if (problem.status !== res.status) problems.push('status 与 HTTP 状态码不一致');
  if (problem.requestId !== res.headers.get('x-request-id')) problems.push('requestId 与响应头不一致');
  if ('statusCode' in problem || 'message' in problem) problems.push('还残留旧格式字段');
  if (!/^https:\/\/nest-lab\.example\/problems\/|^about:blank$/.test(problem.type)) problems.push('type 不在目录里');
  if (text.includes('hunter2') || text.includes('10.0.3.7')) problems.push('泄露了内部信息');
  allOk &&= problems.length === 0;
  out(`${problems.length ? '❌' : '✅'} ${label.padEnd(34)} ${problem.type.replace('https://nest-lab.example/problems/', '…/')} ${problems.join(';')}`);
}
out(`结论:${allOk ? '✅ 12 个错误响应结构完全一致,requestId 全部与响应头一致,500 没有泄露内部信息' : '❌ 有不合格的回执单'}`);

// ---------- 服务端日志:对外克制,对内详尽 ----------
line('服务端日志节选:JSON 语法错误与 500');
for (const l of logs.filter((l) => /Filter 投诉处理台/.test(l) && /(bad-request|500)/.test(l))) {
  out(l.split('\n')[0]); // 500 的那一行后面跟着完整调用栈,这里只看第一行
}

await app.close();
out('\n店已关,进程退出');
