// Day 3 习题 2:backpressure —— write() 返回 false 是红灯,drain 是绿灯
//
// 同一个 64MB 的数据往文件里写:
//   CASE 1(莽夫写法):不管红灯,埋头狂写 → 数据全堆在内存缓冲区
//   CASE 2(守规矩):红灯亮(write 返回 false)就等 drain 绿灯再写
//
// ✍️ 运行前先预测:
//   CASE 1 的缓冲区峰值大约 __64__ MB;CASE 2 的缓冲区峰值大约 __64__ KB
//
// 运行:npx tsx src/03-streams-buffer/ex2-backpressure.ts

import { createWriteStream } from "node:fs";
import { rm } from "node:fs/promises";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, ".tmp-out.bin");

const CHUNK = Buffer.alloc(64 * 1024, "x"); // 每块 64KB
const TOTAL = 64 * 1024 * 1024; // 总共写 64MB
const mb = (n: number) => (n / 1024 / 1024).toFixed(1) + " MB";
const kb = (n: number) => (n / 1024).toFixed(0) + " KB";

// ── CASE 1:不看红绿灯,埋头狂写 ──────────────────────────────
async function naive() {
  const ws = createWriteStream(OUT);
  let written = 0;
  let peakBuffered = 0;
  while (written < TOTAL) {
    ws.write(CHUNK); // 返回值被无视 —— 红灯亮了也照写
    written += CHUNK.length;
    if (ws.writableLength > peakBuffered) peakBuffered = ws.writableLength;
  }
  await once(ws, "drain");
  await new Promise<void>((resolve) => ws.end(resolve));
  console.log(`[莽夫] 缓冲区峰值: ${mb(peakBuffered)}  ← 写不完的全堆在内存里`);
}

// ── CASE 2:红灯停、绿灯行 ────────────────────────────────────
async function polite() {
  const ws = createWriteStream(OUT);
  let written = 0;
  let peakBuffered = 0;
  let redLights = 0;
  while (written < TOTAL) {
    const ok = ws.write(CHUNK); // ok === false 就是红灯:缓冲区超过 highWaterMark
    written += CHUNK.length;
    if (ws.writableLength > peakBuffered) peakBuffered = ws.writableLength;
    if (!ok) {
      redLights++;
      await once(ws, "drain"); // 等绿灯:缓冲区排空后继续
    }
  }
  await new Promise<void>((resolve) => ws.end(resolve));
  console.log(
    `[守规矩] 缓冲区峰值: ${kb(peakBuffered)},等过 ${redLights} 次红灯`,
  );
}

await naive();
await polite();
await rm(OUT, { force: true });

// 思考(写进 notes.md):两种写法最终都写完了 64MB,区别在哪?
// answer: 区别在与 一个是读一个, 写一个
// 📝 批改:不对 ❌ 两种写法都是"写"同一个 64MB,动作一模一样,没有谁在"读"。
//   区别在【内存】:莽夫写法把来不及落盘的数据全堆在内存缓冲区(峰值 64MB);
//   守规矩写法红灯一亮就停,缓冲区始终压在水位线附近(峰值 64KB)——同样的活,内存差 1000 倍。
// 如果 TOTAL 是 64GB 而不是 64MB,莽夫写法会发生什么?
// answer: 如果 TOTAL 是 64GB 而不是 64MB,莽夫写法会导致缓冲区不断增长,最终可能耗尽系统内存,导致进程崩溃或被操作系统杀死。而守规矩的写法会在缓冲区达到 highWaterMark 时暂停写入,等待缓冲区排空后再继续写入,从而避免内存耗尽的问题。
// 📝 批改:完全正确 ✅ 这正是 backpressure 存在的意义。
