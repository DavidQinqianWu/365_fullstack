// 习题 2:拷贝 vs 转移 vs 共享,量出真实差距
// 跑:node src/05-worker-threads/ex2-transfer-modes.ts
import { Worker } from "node:worker_threads";

const SIZE = 200 * 1024 * 1024; // 200 MB

const worker = new Worker(new URL("./ex2-worker.ts", import.meta.url));
const ack = () => new Promise<void>((r) => worker.once("message", () => r()));

// --- 方式 1:拷贝(默认)---
{
  const buf = new ArrayBuffer(SIZE);
  const t0 = performance.now();
  worker.postMessage({ kind: "received", buf });
  await ack();
  console.log(`拷贝   : ${(performance.now() - t0).toFixed(1)}ms   主线程 byteLength=${buf.byteLength}`);
}

// --- 方式 2:转移(零拷贝)---
{
  const buf = new ArrayBuffer(SIZE);
  const t0 = performance.now();
  worker.postMessage({ kind: "received", buf }, [buf]); // ← 第二个参数是转移清单
  await ack();
  console.log(`转移   : ${(performance.now() - t0).toFixed(1)}ms   主线程 byteLength=${buf.byteLength}  ← Q2 看这里`);
}

// --- 方式 3:共享(根本不用传)---
{
  const shared = new SharedArrayBuffer(SIZE);
  const t0 = performance.now();
  worker.postMessage({ kind: "received", buf: shared });
  await ack();
  console.log(`共享   : ${(performance.now() - t0).toFixed(1)}ms   主线程 byteLength=${shared.byteLength}`);
}

// --- Q3:竞态条件实验。先猜结果,再看输出 ---
async function race(unsafe: boolean) {
  const shared = new SharedArrayBuffer(4);
  const view = new Int32Array(shared);
  const done = new Promise<void>((r) => worker.once("message", () => r()));

  worker.postMessage({ kind: "count", shared, unsafe });
  for (let i = 0; i < 100_000; i++) {
    if (unsafe) {
      const cur = view[0]!;   // 读
      view[0] = cur + 1;      // 加 + 写回
    } else {
      Atomics.add(view, 0, 1);
    }
  }
  await done;
  const got = Atomics.load(view, 0);
  console.log(`${unsafe ? "view[0]++  " : "Atomics.add"} : 期望 200000,实际 ${got} ${got === 200000 ? "✅" : "❌ 少了 " + (200000 - got)}`);
}

console.log("\n--- Q3 竞态实验(两个线程各加 100000 次)---");
await race(true);
await race(false);

await worker.terminate();

console.log(`
观察点:
  1. 转移和共享应该是常数时间(几乎为 0),拷贝和数据量成正比。
  2. 转移之后主线程的 byteLength = 0 —— 所有权已经交出去了。
  3. view[0]++ 大概率丢计数:它是「读→加→写回」三步,中间会被另一个线程插进来。
     Atomics.add 是一步完成的,不会被打断。这就是竞态条件。
`);
