// Day 10 观察脚本:一个请求在 AOP 管线里走过哪些站、在哪一站停下。
//
// 跑:npm run day10   (= nest build + node scripts/day10-try.mjs)
// 五种情况:正常 GET / 被 Guard 拦下 / 带钥匙的 POST / Service 抛 404 / Pipe 转换失败
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { configureApp } from '../dist/app.setup.js';

const line = (title) => console.log(`\n========== ${title} ==========`);

const app = await NestFactory.create(AppModule, { logger: false });
configureApp(app); // 和 main.ts 一样:全局 middleware + 计时 interceptor + 异常 filter
await app.listen(0, '127.0.0.1');
const { port } = app.getHttpServer().address();
const base = `http://127.0.0.1:${port}`;

async function call(title, method, path, { body, headers = {} } = {}) {
  line(title);
  const res = await fetch(base + path, {
    method,
    headers: body ? { 'content-type': 'application/json', ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  console.log(`   客户端收到:${res.status} | X-Response-Time: ${res.headers.get('x-response-time') ?? '(没有)'}`);
  console.log(`   ${text}`);
}

await call('情况 1:正常请求 GET /tasks/1', 'GET', '/tasks/1');
await call('情况 2:没带钥匙 POST /tasks(被 Guard 拦下)', 'POST', '/tasks', { body: { title: '学 AOP' } });
await call('情况 2b:带上钥匙 POST /tasks', 'POST', '/tasks', {
  body: { title: '学 AOP' },
  headers: { 'x-demo-key': 'let-me-in' },
});
await call('情况 3:Service 抛异常 GET /tasks/999', 'GET', '/tasks/999');
await call('情况 4:Pipe 转换失败 GET /tasks/abc', 'GET', '/tasks/abc');

await app.close();
console.log('\n店已关,进程退出');
