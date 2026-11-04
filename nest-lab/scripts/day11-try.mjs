// Day 11 观察脚本:标签什么时候贴、贴在哪、保安怎么读、读错了会怎样。
//
// 跑:npm run day11   (= nest build + node scripts/day11-try.mjs)
// 为了好读,这里只保留「保安 / 标签 / 参数装饰器」相关的日志(②-1、🏷️、📌 开头的行)。
const print = console.log.bind(console);
console.log = (...args) => {
  const text = args.join(' ');
  if (/②-1|🏷️|📌/.test(text)) print(...args);
};

print('========== 第 0 幕:import 编译好的类(还没开店) ==========');
const { Module } = await import('@nestjs/common');
const { Reflector } = await import('@nestjs/core');
// Day 19:统一用 createApp()(= NestFactory.create + configureApp,开启 URI 版本化)
const { createApp } = await import('../dist/app.factory.js');
const { AppModule } = await import('../dist/app.module.js');
const { IS_PUBLIC_KEY } = await import('../dist/common/decorators/public.decorator.js');
const { Roles } = await import('../dist/common/decorators/roles.decorator.js');
const { TasksController } = await import('../dist/tasks/tasks.controller.js');
const { DecoratorDemoController, NOTE_KEY } = await import('../dist/decorator-demo/decorator-demo.controller.js');
const { DecoratorDemoModule } = await import('../dist/decorator-demo/decorator-demo.module.js');

const line = (title) => print(`\n========== ${title} ==========`);

class Day11Module {}
Module({ imports: [AppModule, DecoratorDemoModule] })(Day11Module);

line('第 1 幕:开店');
const app = await createApp(Day11Module, { logger: false });
await app.listen(0, '127.0.0.1');
const { port } = app.getHttpServer().address();
const base = `http://127.0.0.1:${port}`;
print('开店完成(注意:开店过程中 📌 没有再打印)');

// ---------- 第 2 幕:用 Reflector 读标签 ----------
line('第 2 幕:Reflector 读到的标签');
const reflector = app.get(Reflector);
const t = TasksController.prototype;
for (const name of ['findAll', 'findOne', 'create', 'remove']) {
  print(
    `TasksController.${name.padEnd(8)} isPublic=${String(reflector.get(IS_PUBLIC_KEY, t[name]))}`.padEnd(48),
    `Roles=${JSON.stringify(reflector.get(Roles, t[name]))}`,
  );
}
const d = DecoratorDemoController.prototype;
print('\nDecoratorDemoController 类上   Roles =', JSON.stringify(reflector.get(Roles, DecoratorDemoController)));
for (const name of ['staffZone', 'adminZone']) {
  const targets = [d[name], DecoratorDemoController];
  print(`${name.padEnd(10)} 方法上 Roles=${JSON.stringify(reflector.get(Roles, d[name]))}`.padEnd(36),
    `getAllAndOverride=${JSON.stringify(reflector.getAllAndOverride(Roles, targets))}`.padEnd(36),
    `getAllAndMerge=${JSON.stringify(reflector.getAllAndMerge(Roles, targets))}`);
}
print('\nNote 标签:类上 =', reflector.get(NOTE_KEY, DecoratorDemoController), '| open 方法上 =', reflector.get(NOTE_KEY, d.open));
print('typo 方法:按正确的 key 读 isPublic =', reflector.get(IS_PUBLIC_KEY, d.typo), '| 按拼错的 key 读 isPubilc =', reflector.get('isPubilc', d.typo));

// ---------- 第 3 幕:发请求 ----------
async function call(title, method, path, headers = {}, body) {
  line(title);
  const res = await fetch(base + path, {
    method,
    headers: body ? { 'content-type': 'application/json', ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  print(`   → ${res.status} ${await res.text()}`);
}
const KEY = { 'x-demo-key': 'let-me-in' };

await call('A. 公开接口不带钥匙 GET /tasks/1', 'GET', '/tasks/1');
await call('B. 受保护接口不带钥匙 POST /tasks', 'POST', '/tasks', {}, { title: '没钥匙' });
await call('C. 带钥匙 + x-request-id POST /tasks', 'POST', '/tasks', { ...KEY, 'x-request-id': 'demo-123' }, { title: '学装饰器' });
await call('D. 带钥匙但没有角色 DELETE /tasks/1', 'DELETE', '/tasks/1', KEY);
await call('E. 带钥匙,角色 staff DELETE /tasks/1', 'DELETE', '/tasks/1', { ...KEY, 'x-demo-role': 'staff' });
await call('F. 带钥匙,角色 admin DELETE /tasks/1', 'DELETE', '/tasks/1', { ...KEY, 'x-demo-role': 'admin' });
await call('G. 拼错 key 的「免检」接口,不带钥匙 GET /decorator-demo/typo', 'GET', '/decorator-demo/typo');
await call('H. 类级别 staff,角色 staff GET /decorator-demo/staff-zone', 'GET', '/decorator-demo/staff-zone', { ...KEY, 'x-demo-role': 'staff' });
await call('I. 方法级别 admin 覆盖类级别,角色 staff GET /decorator-demo/admin-zone', 'GET', '/decorator-demo/admin-zone', { ...KEY, 'x-demo-role': 'staff' });
await call('J1. 参数装饰器第 1 次 GET /decorator-demo/open', 'GET', '/decorator-demo/open');
await call('J2. 参数装饰器第 2 次 GET /decorator-demo/open', 'GET', '/decorator-demo/open');

await app.close();
print('\n店已关,进程退出');
