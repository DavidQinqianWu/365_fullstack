// Day 18 观察脚本:出餐口的打包检查 —— 内部对象、黑名单、白名单、显式映射,谁会把不该出门的东西装进外卖盒?
//
// 跑:npm run day18   (= nest build + node scripts/day18-try.mjs)
console.log = () => {}; // 关掉服务端站点日志,只看结果
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);

const { Module } = await import('@nestjs/common');
// Day 19:统一用 createApp()(= NestFactory.create + configureApp,开启 URI 版本化)
const { createApp } = await import('../dist/app.factory.js');
const { instanceToPlain } = await import('class-transformer');
const { AppModule } = await import('../dist/app.module.js');
const { SerializationDemoModule } = await import('../dist/serialization-demo/serialization-demo.module.js');
const { UserBlacklistEntity, UserWhitelistEntity } = await import('../dist/serialization-demo/user-entities.js');
const { toUserResponse } = await import('../dist/users/dto/user-response.js');

class Day18Module {}
Module({ imports: [AppModule, SerializationDemoModule] })(Day18Module);
const app = await createApp(Day18Module, { logger: false });
await app.listen(0, '127.0.0.1');
const { port } = app.getHttpServer().address();
const base = `http://127.0.0.1:${port}`;
const get = async (path, headers = {}) => {
  const res = await fetch(base + path, { headers });
  return { status: res.status, body: await res.json() };
};
const SECRETS = ['passwordHash', 'resetToken', 'internalNote'];
const leaks = (obj) => SECRETS.filter((k) => k in obj);

// ---------- 第 1 幕:同一个用户,四种装盒方式 ----------
line('第 1 幕:同一个用户(id=1)经过 HTTP 出门的样子');
const show = async (label, path) => {
  const { body } = await get(path);
  out(`${label}\n    字段:${Object.keys(body).join(', ')}\n    带出了不该出门的:${leaks(body).join(', ') || '(没有)'}`);
};
await show('A. 直接 return 内部对象', '/serialization-demo/raw');
await show('B. 黑名单(class 实例 + @Exclude)', '/serialization-demo/blacklist');
await show('C. 白名单(excludeAll + @Expose)', '/serialization-demo/whitelist');
await show('D. 显式映射 toUserResponse(主线:GET /users/1)', '/users/1');

// ---------- 第 2 幕:内部模型新增了一个敏感字段 ----------
line('第 2 幕:内部模型新增敏感字段 resetToken 后,谁会泄露?');
const usersService = app.get((await import('../dist/users/users.service.js')).UsersService);
const user = { ...usersService.findOne(1), resetToken: 'rst_9f2c…(能重置密码的令牌)' }; // 模拟数据库加了一列
const ways = [
  ['直接返回内部对象', () => JSON.parse(JSON.stringify(user))],
  ['黑名单 @Exclude(passwordHash)', () => instanceToPlain(new UserBlacklistEntity(user))],
  ['白名单 excludeAll + @Expose', () => instanceToPlain(new UserWhitelistEntity(user), { strategy: 'excludeAll' })],
  ['显式映射 toUserResponse', () => toUserResponse(user, 'user')],
];
for (const [label, fn] of ways) {
  const o = fn();
  const l = leaks(o);
  out(`${l.length ? '❌' : '✅'} ${label.padEnd(30)} ${l.length ? '泄露了 ' + l.join(', ') : '没有泄露'}`);
}

// ---------- 第 3 幕:同一个资源,普通用户 vs 管理员 ----------
line('第 3 幕:同一个资源,不同视图(groups / 显式映射里的 if)');
for (const [label, path, headers] of [
  ['白名单 groups: []        ', '/serialization-demo/whitelist', {}],
  ['白名单 groups: ["admin"] ', '/serialization-demo/whitelist-admin', {}],
  ['显式映射 普通访客        ', '/users/1', {}],
  ['显式映射 x-demo-role: admin', '/users/1', { 'x-demo-role': 'admin' }],
]) {
  const { body } = await get(path, headers);
  out(`${label} → email=${body.email}  internalNote=${body.internalNote ?? '(没有)'}`);
}

// ---------- 第 4 幕:ClassSerializerInterceptor 只认 class 实例 ----------
line('第 4 幕:返回普通对象时,打包检查员看不见装饰器');
for (const [label, path] of [
  ['黑名单 class 实例          ', '/serialization-demo/blacklist'],
  ['黑名单 但返回了 {...实例}  ', '/serialization-demo/blacklist-plain'],
  ['白名单 class 实例          ', '/serialization-demo/whitelist'],
  ['白名单 但返回了 {...实例}  ', '/serialization-demo/whitelist-plain'],
  ['白名单 普通对象 + @SerializeOptions({ type })', '/serialization-demo/whitelist-plain-typed'],
]) {
  const { body } = await get(path);
  const keys = Object.keys(body);
  out(`${label} → 字段数 ${keys.length}${leaks(body).length ? ',❌ 带出了 ' + leaks(body).join(', ') : ''}${keys.length === 0 ? '(什么都没出门)' : ''}`);
}

// ---------- 第 5 幕:去掉 { data, timestamp } 包装之后 ----------
line('第 5 幕:Day 18 起成功响应不再包装');
const res = await fetch(`${base}/tasks/1`);
out(`GET /tasks/1 → ${res.status}  Content-Type: ${res.headers.get('content-type')}  Date: ${res.headers.get('date')}`);
out(`  ${await res.text()}`);
const created = await fetch(`${base}/users`, {
  method: 'POST',
  headers: { 'x-demo-key': 'let-me-in', 'content-type': 'application/json' },
  body: JSON.stringify({ email: ' Carol@Example.com ', displayName: 'Carol', password: 'carol-secret-1' }),
});
out(`POST /users → ${created.status}  Location: ${created.headers.get('location')}`);
const createdText = await created.text();
out(`  ${createdText}`);
out(`  响应里出现了 password / passwordHash 吗?${/password/i.test(createdText) ? '❌ 出现了' : '✅ 没有'}`);

await app.close();
out('\n店已关,进程退出');
