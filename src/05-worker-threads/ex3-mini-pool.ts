/**
 * Day 5 习题 3:手写迷你线程池 —— 不要每道菜现招一个帮厨
 *
 * 运行:npx tsx src/05-worker-threads/ex3-mini-pool.ts
 *
 * 场景:来了 8 道硬菜(fib(38)),对比两种做法:
 *   Part A:服务员一个人串行做完 8 道
 *   Part B:开一个固定大小的帮厨班组(池大小 = CPU 核数),菜放进排队单,谁空谁接
 *
 * ✍️ 预测(先写再运行):
 *   1. 这台机器有 N 颗核,Part B 大约比 Part A 快几倍?会正好快 N 倍吗?
 *      我的预测:
 *   2. 如果把池大小改成 32(远大于核数),会更快吗?
 *      我的预测:
 */

import { Worker, isMainThread, parentPort, threadId } from "node:worker_threads";
import { availableParallelism } from "node:os";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);

function fib(n: number): number {
  return n <= 1 ? n : fib(n - 1) + fib(n - 2);
}

// ---------- 帮厨:收一道菜,做一道菜,一直待命 ----------
if (!isMainThread) {
  parentPort!.on("message", (n: number) => parentPort!.postMessage({ result: fib(n), threadId }));
}

// ---------- 帮厨班组(线程池) ----------
type Job = { n: number; resolve: (v: { result: number; threadId: number }) => void };

class MiniPool {
  private idle: Worker[] = [];
  private queue: Job[] = []; // 排队单
  private all: Worker[] = [];

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      const w = new Worker(SELF);
      this.all.push(w);
      this.idle.push(w);
    }
  }

  run(n: number) {
    return new Promise<{ result: number; threadId: number }>((resolve) => {
      this.queue.push({ n, resolve });
      this.dispatch();
    });
  }

  // 有空闲帮厨 + 有菜排队 → 派单
  private dispatch() {
    while (this.idle.length > 0 && this.queue.length > 0) {
      const w = this.idle.pop()!;
      const job = this.queue.shift()!;
      w.once("message", (msg) => {
        job.resolve(msg);
        this.idle.push(w); // 做完回到待命区
        this.dispatch(); // 看看排队单上还有没有菜
      });
      w.postMessage(job.n);
    }
  }

  close() {
    return Promise.all(this.all.map((w) => w.terminate()));
  }
}

// ---------- 服务员 ----------
if (isMainThread) {
  const JOBS = Array(8).fill(38);
  const size = Number(process.argv[2]) || availableParallelism();

  console.log(`=== Part A:服务员一个人串行做 ${JOBS.length} 道 fib(38) ===`);
  let t = performance.now();
  for (const n of JOBS) fib(n);
  const serial = performance.now() - t;
  console.log(`耗时 ${serial.toFixed(0)}ms\n`);

  console.log(`=== Part B:帮厨班组(池大小 ${size},机器 ${availableParallelism()} 核)===`);
  const pool = new MiniPool(size);
  t = performance.now();
  const results = await Promise.all(JOBS.map((n) => pool.run(n)));
  const parallel = performance.now() - t;
  console.log(`接单的帮厨 threadId:${results.map((r) => r.threadId).join(", ")}`);
  console.log(`耗时 ${parallel.toFixed(0)}ms,是串行的 ${(serial / parallel).toFixed(1)} 倍速`);
  console.log(`(换个池大小再跑:npx tsx src/05-worker-threads/ex3-mini-pool.ts 32)`);
  await pool.close();
}

/**
 * 思考题(答案写进 notes.md):
 * 1. 为什么池大小超过 CPU 核数之后,再加帮厨不会更快,甚至更慢?
 * 2. 有人想用 worker_threads 去"加速"数据库查询和 HTTP 请求,这个主意对吗?为什么?
 *    (提示:回想 Day 1 —— I/O 等待本来就不占服务员)
 * 3. 生产上不用自己手写池,用现成的 piscina。它比我们的 MiniPool 多做了哪些事?
 *    (提示:帮厨崩了怎么办?菜排太长怎么办?一道菜卡死怎么办?)
 */
