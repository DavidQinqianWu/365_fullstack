// 习题 1:全局变量存 requestId 会串号,AsyncLocalStorage 不会 —— 不用任何框架
//
// 跑:npx tsx src/13-request-context/ex1-global-vs-als.ts
//
// ✍️ 预测(先写在 notes.md 的预测区,再运行):
//   1. 第 1 幕三个「请求」A / B / C 同时进来,各自 await 不同的时间,最后打印的 requestId 对得上吗?哪几个会错?
//   2. 第 2 幕换成 ALS,还会错吗?
//   3. 第 3 幕:一个在「开店时」(任何请求之外)注册的定时器,在请求进行中触发,它读到的 requestId 是什么?
//   4. 第 3 幕:在请求里面注册的 setTimeout,等请求「结束」后才触发,还能读到 requestId 吗?
import { AsyncLocalStorage } from "node:async_hooks";
import { setTimeout as sleep } from "node:timers/promises";

// 一个假的「后厨」:不收 requestId 参数,深处要打日志时自己去拿
async function kitchen(getId: () => string | undefined, ms: number): Promise<string> {
  await sleep(ms); // 模拟查数据库:服务员这时去接待别的请求了
  return `后厨出菜时看到的桌号 = ${getId()}`;
}

// ---------- 第 1 幕:全局变量 ----------
let currentRequestId: string | undefined; // 全店共用一块小黑板
async function handleWithGlobal(id: string, ms: number) {
  currentRequestId = id; // 进门:写上自己的桌号
  const result = await kitchen(() => currentRequestId, ms);
  return `${id}:${result}`;
}

console.log("========== 第 1 幕:全局变量存 requestId ==========");
for (const line of await Promise.all([
  handleWithGlobal("A", 30),
  handleWithGlobal("B", 10),
  handleWithGlobal("C", 20),
])) {
  console.log(" ", line, line.endsWith(line[0]!) ? "✅" : "❌ 串号");
}

// ---------- 第 2 幕:AsyncLocalStorage ----------
const als = new AsyncLocalStorage<{ requestId: string }>();
async function handleWithAls(id: string, ms: number) {
  return als.run({ requestId: id }, async () => {
    const result = await kitchen(() => als.getStore()?.requestId, ms);
    return `${id}:${result}`;
  });
}

console.log("\n========== 第 2 幕:AsyncLocalStorage ==========");
for (const line of await Promise.all([handleWithAls("A", 30), handleWithAls("B", 10), handleWithAls("C", 20)])) {
  console.log(" ", line, line.endsWith(line[0]!) ? "✅" : "❌ 串号");
}

// ---------- 第 3 幕:ALS 只跟着「从这个请求衍生出来的」异步链走 ----------
console.log("\n========== 第 3 幕:哪些东西拿不到桌号牌 ==========");
// 开店时(任何 run 之外)注册的定时器:它属于「开店」这条链,不属于任何请求
const outside = setTimeout(() => {
  console.log("  开店时注册的定时器在请求进行中触发,读到:", als.getStore()?.requestId);
}, 10);

await als.run({ requestId: "D" }, async () => {
  // 在请求里注册、请求「返回」后才触发的定时器:它是从 D 衍生出来的,所以还带着 D
  setTimeout(() => console.log("  请求 D 里注册的定时器,在 D 返回之后触发,读到:", als.getStore()?.requestId), 30);
  await sleep(20);
  console.log("  请求 D 返回前,读到:", als.getStore()?.requestId);
});
console.log("  run 外面(请求 D 已返回),读到:", als.getStore()?.requestId);
await sleep(40);
clearTimeout(outside);
