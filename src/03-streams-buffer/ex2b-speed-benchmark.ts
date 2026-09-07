// Day 3 加餐 ex2b:莽夫写法到底快不快?—— 实测四种写法写 256MB 的耗时
//
//   A 莽夫写法:无视红灯,全部堆进内存缓冲区
//   B 守规矩:红灯停绿灯行(默认 highWaterMark = 16KB)
//   C 守规矩 + 大水位线:highWaterMark = 1MB(合法的"多缓存一点")
//   D 参考:writeFile 一次性写(根本不流式)
//
// 运行:npx tsx src/03-streams-buffer/ex2b-speed-benchmark.ts

import { createWriteStream } from "node:fs";
import { writeFile, rm } from "node:fs/promises";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const CHUNK = Buffer.alloc(64 * 1024, "x"); // 每块 64KB
const TOTAL = 256 * 1024 * 1024; // 共 256MB

async function naive(out: string) {
  const ws = createWriteStream(out);
  let written = 0;
  while (written < TOTAL) {
    ws.write(CHUNK);
    written += CHUNK.length;
  }
  await new Promise<void>((r) => ws.end(r));
}

async function polite(out: string, highWaterMark?: number) {
  const ws = createWriteStream(out, highWaterMark ? { highWaterMark } : {});
  let written = 0;
  while (written < TOTAL) {
    if (!ws.write(CHUNK)) await once(ws, "drain");
    written += CHUNK.length;
  }
  await new Promise<void>((r) => ws.end(r));
}

async function oneShot(out: string) {
  await writeFile(out, Buffer.alloc(TOTAL, "x"));
}

async function timeIt(label: string, fn: (out: string) => Promise<void>) {
  const out = join(here, `.tmp-bench-${label}.bin`);
  const t0 = performance.now();
  await fn(out);
  const ms = (performance.now() - t0).toFixed(0);
  await rm(out, { force: true });
  console.log(`${label.padEnd(2)} 耗时 ${ms} ms`);
}

// 每种跑两轮:第一轮预热(磁盘缓存),第二轮看稳定值
for (let round = 1; round <= 2; round++) {
  console.log(`── 第 ${round} 轮 ──`);
  await timeIt("A", naive);
  await timeIt("B", polite);
  await timeIt("C", (out) => polite(out, 1024 * 1024));
  await timeIt("D", oneShot);
}
