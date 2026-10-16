/**
 * Day 5 习题 1:帮厨 vs 分店 —— worker_threads 和 fork 的上岗成本
 *
 * 运行:npx tsx src/05-worker-threads/ex1-worker-vs-fork.ts
 *
 * 同一个文件扮演三个角色(看 isMainThread / process.argv 判断):
 *   - 主线程(服务员):派活、数心跳
 *   - worker 线程(帮厨):同一家店里,自带小灶(独立 V8 isolate + event loop)
 *   - fork 子进程(分店):Day 4 的老朋友,完整的新 Node 进程
 *
 * Part A:把 fib(40) 交给帮厨算,服务员的心跳停不停?
 * Part B:各请 5 次帮厨、开 5 次分店,比"上岗时间"和"内存账单"
 *
 * ✍️ 预测(先写再运行):
 *   1. Part A 帮厨算 fib(40) 期间,心跳会停吗?和 Day 4 的 fork 版有什么不同?
 *      我的预测:
 *   2. Part B 请一个帮厨 vs 开一家分店,上岗时间差几倍?每个多占多少内存?
 *      我的预测:
 */

import { Worker, isMainThread, parentPort, threadId } from "node:worker_threads";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);

function fib(n: number): number {
  return n <= 1 ? n : fib(n - 1) + fib(n - 2);
}

// ---------- 角色 1:帮厨(worker 线程) ----------
if (!isMainThread) {
  parentPort!.on("message", (msg: { n: number } | "ping") => {
    if (msg === "ping") return parentPort!.postMessage("pong");
    const t = performance.now();
    const result = fib(msg.n);
    parentPort!.postMessage({ result, ms: (performance.now() - t).toFixed(0), threadId });
  });
}
// ---------- 角色 2:分店(fork 子进程) ----------
else if (process.argv[2] === "child") {
  process.on("message", () => {
    process.send!({ pong: true, rssMB: process.memoryUsage().rss / 1024 / 1024 });
  });
}
// ---------- 角色 3:服务员(主线程) ----------
else {
  await partA();
  await partB();
}

async function partA() {
  console.log("=== Part A:帮厨算 fib(40),服务员照常巡场吗? ===");
  let beats = 0;
  const hb = setInterval(() => {
    beats++;
    process.stdout.write(`💓${beats} `);
  }, 200);

  const w = new Worker(SELF);
  const t = performance.now();
  const msg = await new Promise<{ result: number; ms: string; threadId: number }>((r) => {
    w.once("message", r);
    w.postMessage({ n: 40 });
  });
  clearInterval(hb);
  console.log(`\n帮厨(threadId ${msg.threadId})算完 fib(40) = ${msg.result},它自己算 ${msg.ms}ms`);
  console.log(`服务员总等待 ${(performance.now() - t).toFixed(0)}ms,期间心跳 ${beats} 下`);
  console.log(`服务员自己的 threadId 是 ${threadId},进程 PID 都是 ${process.pid} —— 同一家店\n`);
  await w.terminate();
}

async function partB() {
  console.log("=== Part B:请 5 个帮厨 vs 开 5 家分店 ===");
  const ROUNDS = 5;
  const rss = () => process.memoryUsage().rss / 1024 / 1024;

  // 帮厨:从 new Worker 到第一次"pong"回话
  const workers: Worker[] = [];
  const rssBefore = rss();
  let workerMs = 0;
  for (let i = 0; i < ROUNDS; i++) {
    const t = performance.now();
    const w = new Worker(SELF);
    await new Promise((r) => {
      w.once("message", r);
      w.postMessage("ping");
    });
    workerMs += performance.now() - t;
    workers.push(w);
  }
  const workerRss = (rss() - rssBefore) / ROUNDS;

  // 分店:从 fork 到第一次回话
  const children: ReturnType<typeof fork>[] = [];
  let forkMs = 0;
  let childRss = 0;
  for (let i = 0; i < ROUNDS; i++) {
    const t = performance.now();
    const c = fork(SELF, ["child"]);
    const m = await new Promise<{ rssMB: number }>((r) => {
      c.once("message", (x) => r(x as { rssMB: number }));
      c.send("ping");
    });
    forkMs += performance.now() - t;
    childRss += m.rssMB;
    children.push(c);
  }

  console.log(`帮厨:平均上岗 ${(workerMs / ROUNDS).toFixed(0)}ms,每个让本进程 rss 多约 ${workerRss.toFixed(1)}MB`);
  console.log(`分店:平均上岗 ${(forkMs / ROUNDS).toFixed(0)}ms,每家分店自己 rss 约 ${(childRss / ROUNDS).toFixed(1)}MB`);

  await Promise.all(workers.map((w) => w.terminate()));
  children.forEach((c) => c.kill());
}

/**
 * 思考题(答案写进 notes.md):
 * 1. 帮厨和服务员在同一个进程(PID 相同),但帮厨里的变量服务员能直接读到吗?为什么?
 * 2. 上岗成本:帮厨比分店便宜,但"便宜"不等于"免费"。如果每个请求都 new Worker,会怎样?
 * 3. 如果帮厨里抛了一个没 catch 的异常,服务员会跟着崩吗?(提示:试试 worker.on("error"))
 *    如果帮厨调用 process.exit() 呢?分店版本(fork)又会怎样?
 */
