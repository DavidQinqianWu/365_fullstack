/**
 * 实验 02 — 顶层 setTimeout(0) vs setImmediate:【不确定】的顺序
 *
 * 只研究一个问题:主模块顶层注册的 setTimeout(fn, 0) 和
 * setImmediate(fn) 谁先执行。
 *
 * 答案:不确定。timers phase 只执行【已到期】的 timer,
 * 而 setTimeout(0) 会被钳制成 1ms:
 *   - 脚本启动 < 1ms:loop 第 1 轮到 timers phase 时还没到期
 *     → 空转,先看 check → setImmediate 先
 *   - 脚本启动 ≥ 1ms:timer 已到期 → setTimeout 先
 *
 * 多跑几次,两种顺序都可能出现。写代码永远不要依赖这个顺序。
 * (想把它锁定?看 04-timer-ready.ts)
 *
 * 运行: node src/01-event-loop/02-timeout-vs-immediate.ts
 */

setTimeout(() => console.log("[T] setTimeout(0):timers phase"), 0);
setImmediate(() => console.log("[I] setImmediate:check phase"));

console.log("[S] 同步:注册完毕");
