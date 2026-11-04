// Day 8 观察脚本:起应用 → 偷看装饰器贴的标签 → 发 5 个请求 → 打印请求流过的顺序 → 关店。
//
// 跑:npm run day08   (= nest build + node scripts/day08-try.mjs)
// 为什么读 dist/ 而不是直接 tsx 跑 src/?
//   Nest 依赖 tsc 的 emitDecoratorMetadata 把「构造函数需要什么类型」写进产物,
//   tsx(esbuild)不生成这份元数据,Controller 就拿不到 Service(Day 9 细讲)。
// Day 19:统一用 createApp()(= NestFactory.create + configureApp,开启 URI 版本化)
import { createApp } from '../dist/app.factory.js';
import { AppModule } from '../dist/app.module.js';
import { TasksController } from '../dist/tasks/tasks.controller.js';
import { requestLogger } from '../dist/common/request-logger.middleware.js';

const line = (title) => console.log(`\n========== ${title} ==========`);

// ---------- 第 1 幕:开店(注意 Nest 自己打印的启动日志) ----------
line('第 1 幕:开店 NestFactory.create(AppModule)');
const app = await createApp(AppModule);
app.use(requestLogger); // 和 main.ts 一样挂上「门口登记员」
await app.listen(0, '127.0.0.1'); // 端口 0 = 让操作系统随便挑一个空闲端口,不和别的项目抢 3000
const { port } = app.getHttpServer().address();
const base = `http://127.0.0.1:${port}`;

// ---------- 第 2 幕:偷看装饰器贴在类上的标签 ----------
line('第 2 幕:装饰器贴了哪些标签?');
const proto = TasksController.prototype;
console.log('类上的 path 标签        :', Reflect.getMetadata('path', TasksController));
console.log('findOne 的 path 标签    :', Reflect.getMetadata('path', proto.findOne));
console.log('findOne 的 method 标签  :', Reflect.getMetadata('method', proto.findOne), '(0 = GET)');
console.log('create  的 method 标签  :', Reflect.getMetadata('method', proto.create), '(1 = POST)');
console.log(
  '构造函数需要的类型      :',
  Reflect.getMetadata('design:paramtypes', TasksController).map((t) => t.name),
);

// ---------- 第 3 幕:发请求,看一个请求在 Nest 里走过哪些站 ----------
async function call(method, path, body) {
  line(`第 3 幕:${method} ${path}${body ? ' ' + JSON.stringify(body) : ''}`);
  const res = await fetch(base + path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  console.log(`   客户端收到:${res.status} ${text}`);
}

await call('GET', '/tasks');
await call('GET', '/tasks/2');
await call('GET', '/tasks/999'); // 后厨找不到 → 抛 NotFoundException
await call('POST', '/tasks', { title: '学 NestJS' });
await call('POST', '/tasks', {}); // 没有 title,会被拒绝吗?
await call('GET', '/nope'); // 根本没有这条路由

// ---------- 第 4 幕:关店 ----------
line('第 4 幕:关店 app.close()');
await app.close();
console.log('店已关,进程退出');
