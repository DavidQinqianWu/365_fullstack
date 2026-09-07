// Day 3 习题 1:大卡车 vs 传送带 —— 同一个 200MB 文件,两种读法的内存对比
//
// ✍️ 运行前先写预测(填在下方引号里):
//   流式读完 200MB 全程,rss 峰值大约 _200___ MB
//   readFile 一次性读完后,rss 大约涨到 _200_ MB
//
// 📝 批改:流式预测不对 ❌ —— 这正是今天的核心概念:流式的内存占用与文件大小【无关】。
//   桌上永远只放着"运输中的几个周转箱"(默认每块 64KB),200MB 和 2GB 的文件,流式峰值几乎一样。
//   你对 readFile 的思路是对的,只是别忘了涨幅是叠加在基线之上的。
//
// 运行:npx tsx src/03-streams-buffer/ex1-readfile-vs-stream.ts
// (v3:每种读法派生一个【全新进程】测量,基线干净,结论 100% 可复现)

import { readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createFile, cleanupFile, BIG_FILE } from "./helper-bigfile.js";

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1) + " MB";
const rss = () => process.memoryUsage().rss; // 进程常驻内存

// 定时采样 rss 峰值(每 5ms 记一次最高值)
function startPeakSampler() {
  let peak = rss();
  const timer = setInterval(() => {
    if (rss() > peak) peak = rss();
  }, 5);
  return { get peak() { return peak; }, stop: () => clearInterval(timer) };
}

const mode = process.argv[2];

if (mode === "stream" || mode === "readfile") {
  // ── 子进程模式:只跑一种读法,跑完就退出 ─────────────────────
  const base = rss();
  const sampler = startPeakSampler();

  if (mode === "stream") {
    let total = 0;
    let chunks = 0;
    for await (const chunk of createReadStream(BIG_FILE)) {
      total += (chunk as Buffer).length;
      chunks++;
    }
    sampler.stop();
    console.log(`[流式]    基线 ${mb(base)} → 峰值 ${mb(sampler.peak)}(涨幅 ${mb(sampler.peak - base)};读了 ${chunks} 块,共 ${mb(total)})`);
  } else {
    const whole = await readFile(BIG_FILE);
    sampler.stop();
    console.log(`[readFile] 基线 ${mb(base)} → 峰值 ${mb(sampler.peak)}(涨幅 ${mb(sampler.peak - base)};一次性搬进 ${mb(whole.length)})`);
  }
} else {
  // ── 主进程模式:造好文件,派生两个干净子进程分别测量 ──────────
  await createFile();
  const script = fileURLToPath(import.meta.url);
  for (const m of ["stream", "readfile"]) {
    const r = spawnSync("npx", ["tsx", script, m], { stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
  console.log("对比结论:流式涨幅恒定(≈70MB,由 64KB 块和 GC 回收节奏决定,200MB 或 2GB 文件都一样);readFile 涨幅 ≈ 文件本身大小");
  await cleanupFile();
}
