// 习题 3:手写最小 worker pool,对比「每次新建」和「复用池子」
// 跑:node src/05-worker-threads/ex3-worker-pool.ts
import { Worker } from "node:worker_threads";
import os from "node:os";

const TASKS = Array.from({ length: 50 }, () => 32); // 50 个任务,每个算 fib(32)
const WORKER_URL = new URL("./ex3-worker.ts", import.meta.url);

// ---------- 做法 A:每个任务新建一个 worker ----------
async function oneWorkerPerTask(): Promise<number> {
  const t0 = performance.now();
  await Promise.all(
    TASKS.map(
      (n) =>
        new Promise<number>((resolve, reject) => {
          const w = new Worker(WORKER_URL);
          w.postMessage(n);
          w.on("message", (r: number) => w.terminate().then(() => resolve(r)));
          w.on("error", reject);
        }),
    ),
  );
  return performance.now() - t0;
}

// ---------- 做法 B:固定大小的池子 ----------
type Job = { n: number; resolve: (v: number) => void };

class WorkerPool {
  private idle: Worker[] = [];      // 空闲的台子
  private queue: Job[] = [];        // 排队等待的任务
  private busy = new Map<Worker, Job>();

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      const w = new Worker(WORKER_URL);
      w.on("message", (result: number) => {
        const job = this.busy.get(w)!;
        this.busy.delete(w);
        job.resolve(result);
        this.idle.push(w);   // 台子空出来了
        this.dispatch();     // 看看队里还有没有人在等
      });
      this.idle.push(w);
    }
  }

  run(n: number): Promise<number> {
    return new Promise((resolve) => {
      this.queue.push({ n, resolve });
      this.dispatch();
    });
  }

  /**
   * TODO(你来写,约 6-10 行):调度逻辑 —— 池子的核心。
   *
   * 要做的事:把 queue 里等待的任务,分配给 idle 里空闲的 worker。
   *
   * 可以用到的东西:
   *   this.idle    —— Worker[] ,空闲台子
   *   this.queue   —— Job[]    ,排队的任务
   *   this.busy    —— Map<Worker, Job>,记录哪个台子在做哪个任务(message 回调要用它找到 resolve)
   *   worker.postMessage(job.n)  —— 把任务发给台子
   *
   * 要想清楚的三件事(这决定了池子的行为):
   *   1. 什么时候该停?两个数组任意一个空了就没得配了。
   *   2. 一次配一个还是能配几个配几个?(提示:run() 可能被连续调用 50 次)
   *   3. 从队头取还是队尾取?这决定了先来的任务是先被服务还是后被服务。
   */
  private dispatch(): void {
    throw new Error("请先实现 dispatch() —— 见上方 TODO");
  }

  async close() {
    await Promise.all([...this.idle, ...this.busy.keys()].map((w) => w.terminate()));
  }
}

async function withPool(size: number): Promise<number> {
  const pool = new WorkerPool(size);
  const t0 = performance.now();
  await Promise.all(TASKS.map((n) => pool.run(n)));
  const cost = performance.now() - t0;
  await pool.close();
  return cost;
}

// ---------- 跑对比 ----------
const cores = os.availableParallelism();
console.log(`本机可用并行度:${cores}\n`);

const a = await oneWorkerPerTask();
console.log(`做法 A · 每任务一个 worker(共 ${TASKS.length} 次开台): ${a.toFixed(0)}ms`);

for (const size of [4, cores, cores * 2]) {
  const b = await withPool(size);
  console.log(`做法 B · 池子大小 ${String(size).padStart(2)}                     : ${b.toFixed(0)}ms`);
}

console.log(`
观察点:
  1. A 比 B 慢的部分,几乎全是「开台成本」—— 50 次创建 worker 的时间。
  2. 池子大小超过 CPU 核数以后,不会更快(核就那么多),还多花内存。
  3. 这就是「池化」思想。Week 5 学数据库连接池时,你会发现是同一套话。
`);
