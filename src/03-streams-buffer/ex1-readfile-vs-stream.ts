// Day 3 习题 1:大卡车 vs 传送带 —— 同一个 200MB 文件,两种读法的内存对比
//
// ✍️ 运行前先写预测(填在下方引号里):
//   流式读完 200MB 全程,rss 峰值大约 ____ MB
//   readFile 一次性读完后,rss 大约涨到 ____ MB
//
// 运行:npx tsx src/03-streams-buffer/ex1-readfile-vs-stream.ts

import { readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createFile, cleanupFile, BIG_FILE } from "./helper-bigfile.js";

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1) + " MB";
const rss = () => process.memoryUsage().rss; // 进程常驻内存

await createFile();
console.log("基线 rss:", mb(rss()));

// ── 场景 B 先跑:传送带(createReadStream 一块一块读)─────────────
let total = 0;
let chunks = 0;
let streamPeak = rss();
for await (const chunk of createReadStream(BIG_FILE)) {
  total += (chunk as Buffer).length;
  chunks++;
  if (rss() > streamPeak) streamPeak = rss();
}
console.log(`[流式] 读了 ${chunks} 块,共 ${mb(total)},全程 rss 峰值:`, mb(streamPeak));

// ── 场景 A 后跑:大卡车(readFile 一次性全搬进内存)───────────────
const whole = await readFile(BIG_FILE);
console.log(`[readFile] 读完 ${mb(whole.length)},此刻 rss:`, mb(rss()));
console.log("对比结论:流式的峰值 ≈ 基线;readFile 的涨幅 ≈ 文件本身大小");

await cleanupFile();
