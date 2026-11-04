// 习题 1:不用框架,手写「切面」—— 看清 Nest 的 interceptor / filter 本质上在做什么
//
// 跑:npx tsx src/10-aop/ex1-aop-by-hand.ts
//
// ✍️ 预测(先写在 notes.md 的预测区,再运行):
//   1. 第 2 幕给 handler 套了两层切面 [logging, timing],日志里「进」「出」的顺序是怎样的?
//   2. 第 3 幕 findOne(999) 抛错,timing 的「出」还会打印吗?最后调用方拿到的是异常还是一个对象?
//   3. 第 4 幕的切点只选中名字以 find 开头的方法,create 会被计时吗?

// ---------- 业务代码:只有业务,没有日志 / 计时 / 错误翻译 ----------
type Task = { id: number; title: string };
const tasks: Task[] = [{ id: 1, title: "学 AOP" }];
const handlers = {
  findOne(id: number): Task {
    const t = tasks.find((x) => x.id === id);
    if (!t) throw new Error(`没有 id 为 ${id} 的任务`);
    return t;
  },
  create(title: string): Task {
    const t = { id: tasks.length + 1, title };
    tasks.push(t);
    return t;
  },
};

// ---------- 切面 = 一个「包住」函数的函数(around advice) ----------
type Fn = (...args: any[]) => unknown;
type Aspect = (name: string, fn: Fn) => Fn;

const logging: Aspect = (name, fn) => (...args) => {
  console.log(`  [logging] 进 ${name}(${args.join(", ")})`); // before
  const result = fn(...args);
  console.log(`  [logging] 出 ${name}`); // after returning
  return result;
};

const timing: Aspect = (name, fn) => (...args) => {
  const start = performance.now();
  try {
    return fn(...args);
  } finally {
    console.log(`  [timing]  ${name} 用时 ${(performance.now() - start).toFixed(3)} ms`); // after(无论成败)
  }
};

const errorToResponse: Aspect = (_name, fn) => (...args) => {
  try {
    return fn(...args);
  } catch (e) {
    return { statusCode: 404, message: (e as Error).message }; // after throwing:把异常翻译成响应
  }
};

// 织入(weave):按切点(pointcut)挑出要增强的方法,一层层套上切面。数组里第一个在最外层。
function weave<T extends Record<string, Fn>>(target: T, pointcut: RegExp, aspects: Aspect[]): T {
  const out: Record<string, Fn> = { ...target };
  for (const [name, fn] of Object.entries(target)) {
    if (!pointcut.test(name)) continue;
    out[name] = aspects.reduceRight<Fn>((inner, aspect) => aspect(name, inner), fn);
  }
  return out as T;
}

console.log("========== 第 1 幕:裸业务函数 ==========");
console.log(handlers.findOne(1));

console.log("\n========== 第 2 幕:套上 [logging, timing] ==========");
const api = weave(handlers, /.*/, [logging, timing]);
console.log(api.findOne(1));

console.log("\n========== 第 3 幕:再加一层 errorToResponse,让 findOne(999) 抛错 ==========");
const safeApi = weave(handlers, /.*/, [errorToResponse, logging, timing]);
console.log(safeApi.findOne(999));

console.log("\n========== 第 4 幕:切点 /^find/ 只选中 find 开头的方法 ==========");
const partial = weave(handlers, /^find/, [timing]);
console.log(partial.findOne(1));
console.log(partial.create("没被计时"));
