/**
 * Day 5 习题 2:给帮厨递东西的三种方式 —— 复印 / 整箱交出去 / 共用白板
 *
 * 运行:npx tsx src/05-worker-threads/ex2-copy-transfer-shared.ts
 *
 * Part A:递一个 200MB 的 ArrayBuffer
 *   - 复印(postMessage 默认,structured clone):帮厨拿到复印件,原件还在服务员手里
 *   - 整箱交出去(transferList):箱子直接交给帮厨,服务员手里只剩空壳
 * Part B:4 个帮厨在同一块白板(SharedArrayBuffer)上各记 100 万笔账
 *   - 不守规矩:counter[0]++
 *   - 守规矩:Atomics.add(counter, 0, 1)
 *
 * ✍️ 预测(先写再运行):
 *   1. 200MB 复印 vs 整箱交出去,耗时差多少量级?交出去之后,服务员手里的 buffer.byteLength 是多少?
 *      我的预测:
 *   2. 4 × 100 万次 ++,最终白板上是 4,000,000 吗?换成 Atomics 呢?
 *      我的预测:
 */

import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const TIMES = 1_000_000;

// ---------- 帮厨 ----------
if (!isMainThread) {
  if (workerData?.mode) {
    // Part B:在共享白板上记账
    const counter = new Int32Array(workerData.shared as SharedArrayBuffer);
    for (let i = 0; i < TIMES; i++) {
      if (workerData.mode === "plain") counter[0] = counter[0]! + 1; // 就是 counter[0]++,拆开写更看得清
      else Atomics.add(counter, 0, 1);
    }
    parentPort!.postMessage("done");
  } else {
    // Part A:收到箱子,回报"我收到了多大"
    parentPort!.on("message", (buf: ArrayBuffer) => parentPort!.postMessage(buf.byteLength));
  }
}
// ---------- 服务员 ----------
else {
  await partA();
  await partB("plain");
  await partB("atomics");
}

async function partA() {
  console.log("=== Part A:递 200MB 的箱子 ===");
  const w = new Worker(SELF);
  const send = (buf: ArrayBuffer, transfer: boolean) =>
    new Promise<number>((r) => {
      w.once("message", r);
      if (transfer) w.postMessage(buf, [buf]); // 第二个参数 = transferList
      else w.postMessage(buf);
    });

  const big1 = new ArrayBuffer(200 * 1024 * 1024);
  let t = performance.now();
  await send(big1, false);
  console.log(`复印:耗时 ${(performance.now() - t).toFixed(1)}ms,服务员手里原件 byteLength = ${big1.byteLength}`);

  const big2 = new ArrayBuffer(200 * 1024 * 1024);
  t = performance.now();
  await send(big2, true);
  console.log(`整箱交出去:耗时 ${(performance.now() - t).toFixed(1)}ms,服务员手里 byteLength = ${big2.byteLength}\n`);
  await w.terminate();
}

async function partB(mode: "plain" | "atomics") {
  const shared = new SharedArrayBuffer(4); // 一个 int32 大小的白板
  const counter = new Int32Array(shared);
  const t = performance.now();
  await Promise.all(
    Array.from({ length: 4 }, () => {
      const w = new Worker(SELF, { workerData: { mode, shared } });
      return new Promise((r) => w.once("message", () => w.terminate().then(r)));
    }),
  );
  const label = mode === "plain" ? "不守规矩 counter[0]++" : "守规矩 Atomics.add  ";
  console.log(`${label}:最终 = ${counter[0]!.toLocaleString()}(应为 4,000,000),耗时 ${(performance.now() - t).toFixed(0)}ms`);
}

/**
 * 思考题(答案写进 notes.md):
 * 1. counter[0]++ 看起来是一步,为什么会"丢账"?把它拆成三个小动作写出来。
 * 2. Atomics 版正确但更慢,为什么?这和 C#/Java 里的 lock、Interlocked、AtomicInteger 是什么关系?
 * 3. 日常开发,三种递东西方式你默认选哪个?什么时候才值得用 transfer?什么时候才值得用 SharedArrayBuffer?
 */
