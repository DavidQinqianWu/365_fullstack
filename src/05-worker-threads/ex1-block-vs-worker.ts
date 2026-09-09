// 习题 1:用「心跳」当探针,证明 worker 到底救没救主线程
//
// 心跳 = 每 100ms 打一个点。主线程被占住时,点就打不出来。
// 跑:node src/05-worker-threads/ex1-block-vs-worker.ts
import { Worker } from "node:worker_threads";

const N = 40; // ← Q3 把这里改成 25 再跑一次

function fib(n: number): number {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

/** 开一个心跳探针,返回一个「停止并汇报」的函数 */
function startHeartbeat(label: string) {
  const beats: number[] = [];
  let last = Date.now();
  const timer = setInterval(() => {
    beats.push(Date.now() - last);
    last = Date.now();
    process.stdout.write("♥");
  }, 100);

  return () => {
    clearInterval(timer);
    const maxGap = Math.max(...beats, 0);
    console.log(`\n[${label}] 心跳次数=${beats.length} 最大间隔=${maxGap}ms ${maxGap > 500 ? "← 卡住了!" : "← 流畅"}`);
  };
}

async function runInMainThread() {
  console.log("\n=== 方式 1:主线程直接算 ===");
  const stop = startHeartbeat("主线程");
  const t0 = Date.now();
  await new Promise((r) => setTimeout(r, 300)); // 先让心跳正常跳几下
  const result = fib(N);                        // ← 这一行会占住主线程
  const cost = Date.now() - t0;
  // 让出一次事件循环,好让被压住的心跳回调有机会跑一次、把这段空白记下来。
  // 不加这一行,你会看到「假流畅」:卡顿确实发生了,但没人记录。
  await new Promise((r) => setTimeout(r, 0));
  stop();
  console.log(`结果=${result} 总耗时=${cost}ms`);
}

function runInWorker(): Promise<void> {
  console.log("\n=== 方式 2:丢给 worker 算 ===");
  const stop = startHeartbeat("worker");
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL("./ex1-worker.ts", import.meta.url), { workerData: { n: N } });
    w.on("message", (result: number) => {
      const cost = Date.now() - t0;
      stop();
      console.log(`结果=${result} 总耗时=${cost}ms`);
      w.terminate().then(() => resolve()); // 用完关火,否则进程不退出
    });
    w.on("error", reject);
  });
}

await runInMainThread();
await runInWorker();

console.log(`
观察点:
  1. 方式 1 的最大心跳间隔 = 主线程被卡住的时间。这段时间里所有 HTTP 请求都在排队。
  2. 方式 2 的心跳应该一直是 ~100ms。主线程一直空着能接客。
  3. 把 N 改成 25 再跑:worker 版的总耗时可能反而变长了 —— 因为开台成本(10-40ms)比算本身还贵。
`);
