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
// 第1次: I T 第2次:I T 第3次: T I 第4次: I T 第5次: IT
// 发现了什么?
// 我发现就在场景A 中, setTimeout 和 setImmediate 的执行顺序是不确定的,有时 setImmediate 会先执行,有时 setTimeout 会先执行,这取决于事件循环的调度和系统的状态。

// ---------- 场景 B:在 I/O 回调里注册 ----------
// readFile 的回调在 poll 站执行。想想:回调跑完时,服务员巡场的下一站是哪?
readFile("package.json", () => {
  console.log("[B-S] 场景 B:I/O 回调开始(poll 站)");

  setTimeout(() => console.log("[B-T] setTimeout(0):timers 站"), 0);
  setImmediate(() => console.log("[B-I] setImmediate:check 站"));
});

// 【先预测】场景 B 里 T 和 I 谁先?确定吗?
// answer: 确定的 总是先 setImmediate, 因为 I/O 回调执行时,服务员正站在 poll 站,而下一站固定是 check 站,所以 setImmediate 会先于 setTimeout 执行。

// 思考题(写在 notes.md):
// 1. 场景 A 的顺序为什么不确定?(提示:setTimeout(fn, 0) 的 0 会被钳成 1ms,
//    而 timers 站只接待"已到期"的铃铛 —— loop 启动时那 1ms 过没过,谁说了算?)
// answer(2026-08-31 补):
//    ① setTimeout(fn, 0) 的 0 被钳成 1ms,倒计时从【调用那一刻】起算,不是从 loop 启动起算;
//    ② 脚本启动(加载模块等)本身要花时间,而且每次耗时不一样;
//    ③ loop 启动后第一圈巡到 timers 站时,只接待「已到期」的铃铛:
//       若那一刻 1ms 已过 → T 先;若没过 → timers 站空着,继续巡到 check 站 → I 先,T 等下一圈。
//    ④ 所以「谁说了算」:启动耗时。启动耗时受系统当时状态影响,每次运行都不同 → 顺序不确定。

// 2. 场景 B 为什么一定是 I 先 T 后?(提示:I/O 回调执行时,服务员正站在哪一站?
//    他的巡场路线下一站固定是哪一站?)
// answer: 因为 I/O 回调执行时,服务员正站在 poll 站,而下一站固定是 check 站,所以 setImmediate 会先于 setTimeout 执行。

// 3. 工程教训:如果两段代码的先后关系对你很重要,你能依赖场景 A 吗?
//    正确的做法是什么?
// answer: 不能依赖场景 A,因为 setTimeout 和 setImmediate 的执行顺序是不确定的。正确的做法是将两段代码放在 I/O 回调中注册,这样可以确保 setImmediate 会先于 setTimeout 执行,从而保证两段代码的先后关系。
//
// ✅ 订正(2026-08-31):「不能依赖场景 A」对,但「塞进 I/O 回调」是歪招 —
//    它只能锁死 T/I 这一种顺序,语义上也不对(你不是真的要做 I/O)。真正的做法:
//    ① 把依赖先后的代码直接写进前一段的回调里(嵌套/链式),把顺序写进代码结构;
//    ② 用语义明确的原语:要「尽快」用 Promise.then / queueMicrotask,
//       要「本轮 I/O 之后」用 setImmediate,要「下一圈」用 setTimeout。
//    每个原语的语义本身就是顺序保证,而不是去赌顶层调度。
