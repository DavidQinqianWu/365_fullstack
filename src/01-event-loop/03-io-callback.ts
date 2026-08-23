/**
 * 实验 03 — I/O callback 内部:【确定】的顺序
 *
 * 只研究一个问题:在 I/O callback(poll phase)里注册的
 * nextTick / Promise / setImmediate / setTimeout,执行顺序如何。
 *
 * 答案:确定。回调执行时 loop 正处于 poll phase,所以接下来一定是:
 *   同步代码 → nextTick → microtask → check(setImmediate)→ 下一轮 timers(setTimeout)
 *
 * 这也解释了为什么 I/O 回调里 setImmediate 永远赢 setTimeout(0):
 * 不管 timer 的 1ms 到没到期,poll 的下一站都是 check。
 *
 * 注意:I/O 回调内部不再是 ESM 顶层的特殊情况,
 * nextTick 恢复"优先于 microtask"的经典顺序。
 *
 * 标签按【执行顺序】编号 —— 你会看到输出是干净的 1→7。
 *
 * 运行: node src/01-event-loop/03-io-callback.ts
 */

import { readFile } from "node:fs";

console.log("[1] 同步:主模块顶层");

readFile(import.meta.filename, () => {
  console.log("[2] I/O callback 开始 ← poll phase");

  process.nextTick(() => {
    console.log("[4] nextTick:回调结束后最先排空");
  });

  Promise.resolve().then(() => {
    console.log("[5] Promise:microtask 排在 nextTick 之后(回调内恢复经典顺序)");
  });

  setImmediate(() => {
    console.log("[6] setImmediate:check 紧接 poll,先于下一轮 timers");
  });

  setTimeout(() => {
    console.log("[7] setTimeout(0):下一轮 iteration 的 timers phase");
  }, 0);

  console.log("[3] I/O callback 同步部分结束");
});
