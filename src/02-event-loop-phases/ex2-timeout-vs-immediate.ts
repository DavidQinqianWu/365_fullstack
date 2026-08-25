// Day 2 · 习题 2:timers vs check —— setTimeout(0) 和 setImmediate 谁先?
// 目标:理解「顶层不确定,I/O 回调里确定」这条 event loop 经典规则
// 运行:npx tsx src/02-event-loop-phases/ex2-timeout-vs-immediate.ts(多跑几次!)
import { readFile } from "node:fs";

// ---------- 场景 A:顶层直接注册 ----------
// 【先预测】T 和 I 谁先?_________________
console.log("[A-S] 场景 A 同步:注册完毕");

setTimeout(() => console.log("[A-T] setTimeout(0):timers 站"), 0);
setImmediate(() => console.log("[A-I] setImmediate:check 站"));

// TODO:把上面两行多跑 5 次,记录 T/I 出现的先后顺序:
// 第1次:___ 第2次:___ 第3次:___ 第4次:___ 第5次:___
// 发现了什么?____________________________________

// ---------- 场景 B:在 I/O 回调里注册 ----------
// readFile 的回调在 poll 站执行。想想:回调跑完时,服务员巡场的下一站是哪?
readFile("package.json", () => {
  console.log("[B-S] 场景 B:I/O 回调开始(poll 站)");

  setTimeout(() => console.log("[B-T] setTimeout(0):timers 站"), 0);
  setImmediate(() => console.log("[B-I] setImmediate:check 站"));
});

// 【先预测】场景 B 里 T 和 I 谁先?确定吗?_________________

// 思考题(写在 notes.md):
// 1. 场景 A 的顺序为什么不确定?(提示:setTimeout(fn, 0) 的 0 会被钳成 1ms,
//    而 timers 站只接待"已到期"的铃铛 —— loop 启动时那 1ms 过没过,谁说了算?)
// 2. 场景 B 为什么一定是 I 先 T 后?(提示:I/O 回调执行时,服务员正站在哪一站?
//    他的巡场路线下一站固定是哪一站?)
// 3. 工程教训:如果两段代码的先后关系对你很重要,你能依赖场景 A 吗?
//    正确的做法是什么?
