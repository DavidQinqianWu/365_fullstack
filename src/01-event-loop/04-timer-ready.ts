/**
 * 实验 04 — 把"不确定"变成"可控":先注册,再忙等
 *
 * 实验 02 里顶层 setTimeout(0) vs setImmediate 的顺序不确定,
 * 本实验展示如何人为锁定它。
 *
 * 原理:timer 的 1ms 倒计时从【注册那一刻】起算,不是从 loop 启动起算。
 * 注册完之后忙等 3ms,event loop 启动时 timer 必然已到期,
 * 于是第 1 轮 iteration 的 timers phase 先执行 setTimeout —— 每次运行都一样。
 *
 * 反例(可以把忙等挪到注册之前试试):毫无效果 ——
 * 倒计时从注册才开始,loop 启动时仍未到期,setImmediate 依然先跑。
 *
 * 运行: node src/01-event-loop/04-timer-ready.ts
 */

// 1. 先注册。
setTimeout(() => console.log("[T] setTimeout(0):稳定先跑(timer 已到期)"), 0);
setImmediate(() => console.log("[I] setImmediate:稳定后跑(check 排在 timers 之后)"));

// 2. 再忙等 3ms,把 1ms 的 timer 倒计时耗尽。
//    忙等是同步代码,期间 event loop 尚未启动。
const spinUntil = Date.now() + 3;
while (Date.now() < spinUntil) {
  // 忙等中
}

console.log("[S] 同步:忙等结束,event loop 即将启动");
