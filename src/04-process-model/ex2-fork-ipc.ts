/**
 * Day 4 习题 2:fork + IPC —— 硬菜外包给分店,总店照常营业
 *
 * 运行:npx tsx src/04-process-model/ex2-fork-ipc.ts
 *
 * 场景:有个 CPU 密集任务 fib(42),要算 1~2 秒,期间把一颗核占满。
 * 对照两种做法:
 *   Part A:直接在主进程算 —— 服务员亲自下厨,心跳(其他客人)全部卡住
 *   Part B:fork 一个子进程去算 —— 分店伙计做菜,总店服务员照常招呼客人
 *
 * ✍️ 预测(先写再运行):
 *   1. Part A 期间,心跳会停跳几下?
 *      实测(参考答案):一下都不跳(实测 0 下,耗时约 3s)。主线程被 fib 占满,定时器回调根本排不上队;算完后 setInterval 也不会"补跳"错过的那些。
 *   2. Part B 期间,心跳会停吗?两种做法总耗时差多少?
 *      实测(参考答案):不停,实测照常跳了 17 下。总耗时 Part A 约 2959ms、Part B 约 3313ms,B 还慢了约 350ms(多了启动新进程 + IPC 的开销)。fork 换来的是"不卡场",不是"算得更快"。
 */

import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";

const WORKER = fileURLToPath(new URL("./ex2-heavy-task.ts", import.meta.url));

function fib(n: number): number {
  return n <= 1 ? n : fib(n - 1) + fib(n - 2);
}

// 心跳 = 其他客人的请求。每 200ms 跳一下;卡住不跳 = 客人被晾着
let beats = 0;
const heartbeat = setInterval(() => {
  beats++;
  process.stdout.write(`💓${beats} `);
}, 200);

const N = 42; // 硬菜难度

// ---------- Part A:主进程亲自下厨 ----------
console.log("\n=== Part A:主进程自己算 fib(42)===");
const t0 = performance.now();
const beatsBeforeA = beats;
const r = fib(N);
const costA = performance.now() - t0;
console.log(`\n结果 fib(${N}) = ${r}`);
console.log(`耗时 ${costA.toFixed(0)}ms,期间心跳只跳了 ${beats - beatsBeforeA} 下(全员陪等)\n`);

// ---------- Part B:fork 分店外包 ----------
console.log("=== Part B:fork 子进程去算 ===");
const t1 = performance.now();
const beatsBeforeB = beats;

const child = fork(WORKER, [], {
  // fork 默认带 IPC 通道;stdio 里 inherit 让分店的心跳直接打到我的终端
  stdio: ["inherit", "inherit", "inherit", "ipc"],
});

// 对讲机派单
child.send({ n: N });

// 对讲机回话
child.on("message", (msg: { result: number; ms: string; pid: number }) => {
  const costB = performance.now() - t1;
  console.log(`\n分店(PID ${msg.pid})喊回来了:fib(${N}) = ${msg.result},它自己算 ${msg.ms}ms`);
  console.log(`我总耗时 ${costB.toFixed(0)}ms,期间心跳跳了 ${beats - beatsBeforeB} 下(照常营业)`);

  clearInterval(heartbeat);
  child.kill();

  console.log("\n📌 关键点:两家分店是【独立内存】—— fib 的递归栈全在子进程,");
  console.log("   对讲机(message)是唯一的沟通方式,不存在共享变量。");
});

/**
 * 思考题(答案写进 notes.md):
 * 1. 为什么不用共享内存传 fib 的结果?进程间共享内存意味着什么?(提示:回到概念卡 #1)
 * 2. 如果 fib 要算 10 分钟,子进程卡死/崩溃了,主进程会怎样?反过来主进程崩了,子进程会怎样?
 * 3. fork 的子进程跑的还是 Node(又一个 V8,几十 MB 内存起步)。如果重活只需几毫秒但一天几百万次,
 *    每次 fork 划算吗?应该用什么?(提示:池;也为 Day 5 worker_threads 埋个钩子)
 */
