/**
 * 实验 01 — 同步代码 vs nextTick vs microtask
 *
 * 只研究一个问题:同一个 tick 里,同步代码、process.nextTick、
 * Promise.then、queueMicrotask 的执行顺序。
 *
 * 重点:本文件是 ES module(package.json "type": "module")。
 * ESM 顶层求值结束时,V8 会先排空自己的 microtask 队列,
 * Node 的 nextTick 队列反而排在后面 —— 与 CJS(nextTick 优先)相反。
 *
 * 标签按【注册顺序】编号,看输出里编号的乱序就能看出真实调度顺序。
 *
 * 运行: node src/01-event-loop/01-sync-nexttick-microtask.ts
 */

function log(label: string): void {
  console.log(label);
}

// 1. 同步代码永远最先执行 —— 它就是当前 tick 本身。
log("[1] 同步:顶层代码");

// 2. ESM vs CJS 的坑(本实验实测验证):
//    CJS 的规则是"nextTick 队列先于 promise microtask 排空"。
//    而在 ES module(比如本文件)里,V8 会在模块求值结束时排空 microtask 队列
//    —— 早于 Node 处理 nextTick 队列。
//    所以这里 promise / queueMicrotask 的回调反而先执行。
//    面试答案:"nextTick 优先"只在 CJS 下成立。
process.nextTick(() => log("[2] nextTick:第 1 个注册,但在 ESM 下输给 microtask"));

// 3. Promise.then 和 queueMicrotask 共用 V8 的 microtask 队列,
//    按注册顺序 FIFO 执行。
Promise.resolve().then(() => log("[3] promise.then:microtask(第 1 个注册)"));
queueMicrotask(() => log("[4] queueMicrotask:microtask(第 2 个注册,FIFO 排在 promise 之后)"));

process.nextTick(() => {
  log("[5] nextTick:第 2 个回调 —— nextTick 队列自身是 FIFO,且会完全排空");
});

console.log("[6] 同步:顶层脚本结束");
