// Day 9 观察脚本:IoC 容器做了什么 + 三种作用域各造了几个实例。
//
// 跑:npm run day09   (= nest build + node scripts/day09-try.mjs)
// 和 day08 一样读 dist/:design:paramtypes 只有 tsc 会生成。
import { Module } from '@nestjs/common';
// Day 19:统一用 createApp()(= NestFactory.create + configureApp,开启 URI 版本化)
import { createApp } from '../dist/app.factory.js';
import { AppModule } from '../dist/app.module.js';
import { CLOCK } from '../dist/common/clock.js';
import { created } from '../dist/scope-demo/counters.js';
import { ReportService } from '../dist/scope-demo/report.service.js';
import { ScopeDemoController } from '../dist/scope-demo/scope-demo.controller.js';
import { ScopeDemoModule } from '../dist/scope-demo/scope-demo.module.js';
import { TasksController } from '../dist/tasks/tasks.controller.js';
import { TASKS_REPOSITORY } from '../dist/tasks/tasks.repository.js';
import { TasksService } from '../dist/tasks/tasks.service.js';

const line = (title) => console.log(`\n========== ${title} ==========`);

// 装饰器就是函数(Day 8):.mjs 里不能写 @Module,就直接把它当函数调用,给这个空类贴上编制表
class Day09Module {}
Module({ imports: [AppModule, ScopeDemoModule] })(Day09Module);

// ---------- 第 1 幕:开店。注意哪些 🆕 在任何请求到来之前就出现了 ----------
line('第 1 幕:开店(请求还没来)');
const app = await createApp(Day09Module, {
  logger: false, // 关掉 Nest 自己的日志,只看我们的 🆕
  abortOnError: false, // 默认 app.get() 出错会直接结束进程,这里改成抛异常让我们 catch
});
await app.listen(0, '127.0.0.1');
const { port } = app.getHttpServer().address();
const base = `http://127.0.0.1:${port}`;

// ---------- 第 2 幕:容器靠什么知道「谁需要谁」 ----------
line('第 2 幕:构造函数元数据');
const typeNames = (cls) => (Reflect.getMetadata('design:paramtypes', cls) ?? []).map((t) => t.name);
const injectTokens = (cls) =>
  (Reflect.getMetadata('self:paramtypes', cls) ?? []).map((x) => `#${x.index} → ${String(x.param)}`);
console.log('TasksController  design:paramtypes:', typeNames(TasksController));
console.log('TasksService     design:paramtypes:', typeNames(TasksService));
console.log('TasksService     @Inject 贴的标签  :', injectTokens(TasksService));

// ---------- 第 3 幕:从容器里取东西 ----------
line('第 3 幕:app.get() 向容器要人');
const s1 = app.get(TasksService);
const s2 = app.get(TasksService);
console.log('两次要 TasksService 是同一个吗?', s1 === s2);
console.log('TASKS_REPOSITORY 实际是谁      :', app.get(TASKS_REPOSITORY).constructor.name);
console.log('CLOCK 现在几点                 :', app.get(CLOCK).now().toISOString());
try {
  app.get(ReportService); // ReportService 被传染成了请求作用域
} catch (e) {
  console.log('app.get(ReportService) 报错    :', e.constructor.name);
  console.log('                                ', e.message);
}

// ---------- 第 4 幕:连发 3 个请求,数实例 ----------
for (let i = 1; i <= 3; i++) {
  line(`第 4 幕:第 ${i} 个请求 GET /scope-demo`);
  const res = await fetch(`${base}/scope-demo`);
  console.log('  响应:', JSON.stringify(await res.json()));
}

line('第 5 幕:3 个请求之后,每个类一共被 new 了几次');
console.table({
  SingletonCounter: created.SingletonCounter ?? 0,
  RequestCounter: created.RequestCounter ?? 0,
  TransientCounter: created.TransientCounter ?? 0,
  ReportService: ReportService.created,
  ScopeDemoController: ScopeDemoController.created,
});

await app.close();
console.log('\n店已关,进程退出');
