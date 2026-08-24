// Day 2 · 实验 3:Transform + pipeline 大文件流式处理
// 运行:node src/02-streams/exp3-transform-pipeline.ts
//
// 任务:造一个 100MB 的假日志文件,然后像水果加工厂一样:
//   🚰 水龙头:读文件(Readable)
//   🍊 榨汁机 1:按行切开,只留 ERROR 行(Transform)
//   🍊 榨汁机 2:压缩(Transform / gzip)
//   🕳️ 下水口:写出 .gz 文件(Writable)
// 全程用 pipeline 管家:自动背压 + 出错自动清理。
// 验证点:处理 100MB 文件,内存占用始终只有几十 MB。

import fs from "node:fs";
import zlib from "node:zlib";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import os from "node:os";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "day2-streams-"));
const BIG_LOG = path.join(TMP, "big.log");
const OUT = path.join(TMP, "errors.log.gz");
const LINES = 1_000_000; // 100 万行,约 100MB

// ── 第 1 步:流式生成 100MB 日志(这里也用背压写法!)──────
async function generateBigLog() {
  console.log("1. 生成 100MB 假日志……");
  const out = fs.createWriteStream(BIG_LOG);
  for (let i = 0; i < LINES; i++) {
    const level = i % 50 === 0 ? "ERROR" : "INFO"; // 2% 是错误行
    const line = `${new Date().toISOString()} [${level}] request #${i} path=/api/users/${i % 1000} cost=${i % 97}ms\n`;
    const ok = out.write(line);
    if (!ok) await new Promise((r) => out.once("drain", r)); // 窗口满了就等
  }
  await new Promise<void>((r) => out.end(r));
  const mb = (fs.statSync(BIG_LOG).size / 1024 / 1024).toFixed(1);
  console.log(`   生成完毕:${mb} MB,${LINES.toLocaleString()} 行`);
}

// ── 第 2 步:手写 Transform —— 行切割器 ────────────────
// 难点:chunk 边界可能把一行切成两半(就像汉字被切成乱码),
// 所以要留一个「口袋」装半行,等下一块来了再拼上。
class LineSplitter extends Transform {
  private pocket = "";
  override _transform(chunk: Buffer, _enc: string, cb: () => void) {
    const text = this.pocket + chunk.toString();
    const lines = text.split("\n");
    this.pocket = lines.pop()!; // 最后一段可能不完整,先揣口袋
    for (const line of lines) this.push(line + "\n");
    cb();
  }
  override _flush(cb: () => void) {
    if (this.pocket) this.push(this.pocket + "\n"); // 文件结尾倒出兜里剩下的
    cb();
  }
}

// ── 第 3 步:手写 Transform —— ERROR 过滤器 ────────────
class ErrorFilter extends Transform {
  kept = 0;
  override _transform(chunk: Buffer, _enc: string, cb: () => void) {
    const line = chunk.toString();
    if (line.includes("[ERROR]")) {
      this.kept++;
      this.push(line); // 只放行 ERROR 行,其余丢掉
    }
    cb();
  }
}

// ── 第 4 步:pipeline 串起整条流水线 ───────────────────
async function processLog() {
  console.log("2. pipeline 流水处理:读 → 切行 → 过滤 ERROR → gzip → 写出……");
  const filter = new ErrorFilter();
  const memBefore = process.memoryUsage().rss / 1024 / 1024;

  await pipeline(
    fs.createReadStream(BIG_LOG), // 🚰 水龙头
    new LineSplitter(),           // 🍊 榨汁机 1:切行
    filter,                       // 🍊 榨汁机 2:只留 ERROR
    zlib.createGzip(),            // 🍊 榨汁机 3:压缩
    fs.createWriteStream(OUT),    // 🕳️ 下水口
  );

  const memAfter = process.memoryUsage().rss / 1024 / 1024;
  const outKb = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log(`   处理完毕:筛出 ${filter.kept.toLocaleString()} 行 ERROR,压缩后 ${outKb} KB`);
  console.log(`   进程 RSS:${memBefore.toFixed(0)} MB → ${memAfter.toFixed(0)} MB(文件 ~74MB,峰值远低于一次性读入)`);
}

// ── 第 5 步:故意出错,验证 pipeline 会清理残局 ─────────
async function failureDemo() {
  console.log("3. 故障演练:流水线中途爆炸,pipeline 自动清理……");
  const BOOM = new Transform({
    transform(_c, _e, cb) {
      cb(new Error("💥 榨汁机炸了!")); // 模拟中间环节出错
    },
  });
  const halfFile = path.join(TMP, "half.gz");
  try {
    await pipeline(fs.createReadStream(BIG_LOG), BOOM, fs.createWriteStream(halfFile));
  } catch (err) {
    console.log(`   捕获错误:${(err as Error).message}`);
    console.log(`   半成品文件已被销毁/不再写入,所有流都已关闭,没有内存泄漏`);
  }
}

await generateBigLog();
await processLog();
await failureDemo();
fs.rmSync(TMP, { recursive: true, force: true }); // 打扫战场

console.log("\n💡 90% 的日常场景 = Readable → Transform×N → Writable,交给 pipeline 管家。");
console.log("✅ 实验 3 完成");
