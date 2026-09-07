/**
 * Day 4 习题 2 的分店伙计 —— 被 fork 出来的子进程
 *
 * 它不自己运行,由 ex2-fork-ipc.ts 通过 fork() 启动。
 * 职责:收到总店(主进程)的对讲机消息 → 做一道硬菜(CPU 密集计算)→ 把结果喊回去。
 */

// 故意用最蠢的递归,把 CPU 占满,模拟真实世界里的重活:
// 图片处理、视频转码、密码哈希、大报表计算……
function fib(n: number): number {
  return n <= 1 ? n : fib(n - 1) + fib(n - 2);
}

// 对讲机:听总店派单
process.on("message", (msg: { n: number }) => {
  const start = performance.now();
  const result = fib(msg.n);
  const ms = (performance.now() - start).toFixed(0);

  // 喊回去:结果 + 我是谁(PID)
  process.send?.({ result, ms, pid: process.pid });
});
