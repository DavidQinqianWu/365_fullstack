// Day 16 观察脚本:DTO + ValidationPipe 的报关现场,以及 class-validator vs zod 对同一份输入的反应。
//
// 跑:npm run day16   (= nest build + node scripts/day16-try.mjs)
console.log = () => {}; // 关掉服务端站点日志,只看结果
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);

const { ValidationPipe } = await import('@nestjs/common');
const { NestFactory } = await import('@nestjs/core');
const { IsString } = await import('class-validator');
const { AppModule } = await import('../dist/app.module.js');
const { validationPipeOptions } = await import('../dist/common/validation/validation.options.js');
const { ZodValidationPipe } = await import('../dist/common/validation/zod-validation.pipe.js');
const { CreateTaskDto } = await import('../dist/tasks/dto/create-task.dto.js');
const { createTaskSchema } = await import('../dist/tasks/dto/task.zod.js');

const app = await NestFactory.create(AppModule, { logger: false });
await app.listen(0, '127.0.0.1');
const { port } = app.getHttpServer().address();
const base = `http://127.0.0.1:${port}`;
const H = { 'x-demo-key': 'let-me-in', 'content-type': 'application/json' };

async function call(label, method, path, body) {
  const res = await fetch(base + path, { method, headers: H, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json();
  // Day 17 起错误体是 problem+json:字段错误在 errors 里,其他错误看 detail
  const detail = res.ok ? JSON.stringify(json.data) : JSON.stringify(json.errors?.length ? json.errors : json.detail);
  out(`${label}\n    → ${res.status} ${detail}`);
}

// ---------- 第 1 幕:HTTP 报关现场 ----------
line('第 1 幕:合法 / 非法请求(全局 ValidationPipe,APP_PIPE 注册)');
await call('A. POST {}(Day 8 的老坑)', 'POST', '/tasks', {});
await call('B. POST {title:"   "}(自定义校验器)', 'POST', '/tasks', { title: '   ' });
await call('C. POST {title:123}(类型错)', 'POST', '/tasks', { title: 123 });
await call('D. POST {title, id:99, done:true}(批量赋值)', 'POST', '/tasks', { title: '想自己定 id', id: 99, done: true });
await call('E. POST checklist 第 2 项不合法(嵌套数组)', 'POST', '/tasks', {
  title: '带清单',
  checklist: [{ text: '买菜', done: true }, { text: ' ', done: 'no' }],
});
await call('F. POST 合法,带 checklist', 'POST', '/tasks', { title: '带清单', checklist: [{ text: '买菜', done: false }] });
await call('G. PATCH /tasks/3 {}', 'PATCH', '/tasks/3', {});
await call('H. PATCH /tasks/3 {done:true}', 'PATCH', '/tasks/3', { done: true });
await call('I. PUT /tasks/3 {title, done}(没给 checklist)', 'PUT', '/tasks/3', { title: '带清单', done: false });
await call('J. PATCH /tasks/1 {title}(格式没问题,但违反业务规则)', 'PATCH', '/tasks/1', { title: '改名' });
await call('K. GET /tasks/abc(路径参数)', 'GET', '/tasks/abc');

// ---------- 第 2 幕:transform 做了什么 ----------
line('第 2 幕:transform —— 报关员把手写数字誊成标准格式');
const pipe = new ValidationPipe(validationPipeOptions);
const param = (v) => pipe.transform(v, { type: 'param', metatype: Number, data: 'id' });
out(`路径参数 '42'  → ${JSON.stringify(await param('42'))}(typeof ${typeof (await param('42'))})`);
out(`路径参数 'abc' → ${await param('abc')}  ← 没报错!所以 :id 上还要 ParseIntPipe(K 的 400 就是它拦的)`);
const dto = await pipe.transform({ title: 'x' }, { type: 'body', metatype: CreateTaskDto });
out(`transform: true  → body 是 CreateTaskDto 实例吗?${dto instanceof CreateTaskDto}`);
const noTransform = new ValidationPipe({ ...validationPipeOptions, transform: false });
const plain = await noTransform.transform({ title: 'x' }, { type: 'body', metatype: CreateTaskDto });
out(`transform: false → body 是 CreateTaskDto 实例吗?${plain instanceof CreateTaskDto}(校验照做,但拿到的还是普通对象)`);

// ---------- 第 3 幕:whitelist vs forbidNonWhitelisted,以及「忘了贴装饰器」 ----------
line('第 3 幕:多出来的字段怎么处理');
class NoteDto {} // 两个字段:title 贴了 @IsString(),note 忘了贴任何装饰器
IsString()(NoteDto.prototype, 'title');
const input = { title: '标题', note: '我是备注', hacker: true };
const show = async (label, p) => {
  try {
    out(`${label} → 通过,拿到 ${JSON.stringify(await p.transform(input, { type: 'body', metatype: NoteDto }))}`);
  } catch (e) {
    out(`${label} → ${e.getStatus()} ${JSON.stringify(e.getResponse().message)}`);
  }
};
out(`输入:${JSON.stringify(input)}`);
await show('whitelist: true                      ', new ValidationPipe({ whitelist: true, transform: true }));
await show('whitelist + forbidNonWhitelisted     ', new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, errorHttpStatusCode: 422 }));
await show('都不开                                ', new ValidationPipe({ transform: true }));

// ---------- 第 4 幕:class-validator vs zod,同一份输入 ----------
line('第 4 幕:同一份报关单,两种写法');
const zodPipe = new ZodValidationPipe(createTaskSchema);
const cases = [
  ['合法', { title: '  学 zod  ', checklist: [{ text: 'a', done: false }] }],
  ['缺 title', {}],
  ['title 全是空白', { title: '   ' }],
  ['多余字段 id', { title: 'x', id: 1 }],
  ['清单第 1 项 done 不是布尔', { title: 'x', checklist: [{ text: 'a', done: 'no' }] }],
];
const run = async (fn) => {
  try {
    return `通过 ${JSON.stringify(await fn())}`;
  } catch (e) {
    // Day 17 起 exceptionFactory 抛的是 ProblemException,字段错误在 extensions.errors 里
    return `${e.getStatus()} ${JSON.stringify(e.extensions?.errors ?? e.getResponse().message)}`;
  }
};
for (const [label, body] of cases) {
  out(`【${label}】输入 ${JSON.stringify(body)}`);
  out(`  class-validator → ${await run(() => pipe.transform(body, { type: 'body', metatype: CreateTaskDto }))}`);
  out(`  zod             → ${await run(() => zodPipe.transform(body))}`);
}

// ---------- 第 5 幕:粗测性能(同一台机器、同一个进程,只看数量级) ----------
line('第 5 幕:各校验 20000 次合法输入');
const N = 20000;
const good = { title: '学 zod', checklist: [{ text: 'a', done: false }, { text: 'b', done: true }] };
let t = performance.now();
for (let i = 0; i < N; i++) await pipe.transform(good, { type: 'body', metatype: CreateTaskDto });
const cv = performance.now() - t;
t = performance.now();
for (let i = 0; i < N; i++) zodPipe.transform(good);
const zd = performance.now() - t;
out(`class-validator:${cv.toFixed(0)} ms(每次约 ${((cv / N) * 1000).toFixed(1)} µs)`);
out(`zod            :${zd.toFixed(0)} ms(每次约 ${((zd / N) * 1000).toFixed(1)} µs)`);

await app.close();
out('\n店已关,进程退出');
