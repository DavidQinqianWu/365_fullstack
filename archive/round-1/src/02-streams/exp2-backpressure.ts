// Day 2 · 实验 2:手写 backpressure(背压)—— 汉堡店喊「暂停!」
// 运行:node src/02-streams/exp2-backpressure.ts
//
// 场景:Readable(后厨)生产快,Writable(前台)消费慢。
// 对照 A:不理会 write() 的返回值 → 数据在内存里越堆越高(汉堡塌了)
// 实验 B:write() 返回 false 就 pause,'drain' 后再 resume → 内存恒定

import { Readable, Writable } from "node:stream";

// ── 一个「无限生产」的快后厨 ─────────────────────────
function createKitchen(totalChunks: number, chunkSize: number) {
  let produced = 0;
  return new Readable({
    highWaterMark: 16 * 1024, // 后厨自己的小仓库:16KB
    read() {
      if (produced >= totalChunks) {
        this.push(null); // 做完了,收工
        return;
      }
      produced++;
      this.push(Buffer.alloc(chunkSize, "x")); // 每次做一个 64KB 的「汉堡」
    },
  });
}

// ── 一个「慢慢卖」的前台:每块数据要 5ms 才能消化 ─────
function createSlowCounter(onWrite: (queuedBytes: number) => void) {
  return new Writable({
    highWaterMark: 16 * 1024, // 出餐窗口容量:16KB
    write(chunk, _enc, cb) {
      onWrite(this.writableLength); // 报告窗口里还堆着多少字节
      setTimeout(cb, 5); // 模拟慢速消费
    },
  });
}

// ── 对照 A:无视背压,闷头狂写 ────────────────────────
function withoutBackpressure(): Promise<number> {
  return new Promise((resolve, reject) => {
    const src = createKitchen(200, 64 * 1024); // 200 块 × 64KB ≈ 12.8MB
    const out = createSlowCounter(() => {});
    let maxQueued = 0;

    src.on("data", (chunk) => {
      out.write(chunk); // ❌ 不看返回值,窗口满了也硬塞
      maxQueued = Math.max(maxQueued, out.writableLength);
    });
    src.on("end", () => out.end(() => resolve(maxQueued)));
    src.on("error", reject);
    out.on("error", reject);
  });
}

// ── 实验 B:正确处理背压 ─────────────────────────────
function withBackpressure(): Promise<number> {
  return new Promise((resolve, reject) => {
    const src = createKitchen(200, 64 * 1024);
    const out = createSlowCounter(() => {});
    let maxQueued = 0;
    let pauseCount = 0;

    src.on("data", (chunk) => {
      const ok = out.write(chunk);
      maxQueued = Math.max(maxQueued, out.writableLength);
      if (!ok) {
        // 窗口满了!write() 返回 false → 举牌「后厨停一下」
        pauseCount++;
        src.pause();
        out.once("drain", () => {
          // 窗口排空了 → 举牌「继续!」
          src.resume();
        });
      }
    });
    src.on("end", () => out.end(() => {
      console.log(`   (期间后厨被喊停了 ${pauseCount} 次)`);
      resolve(maxQueued);
    }));
    src.on("error", reject);
    out.on("error", reject);
  });
}

// ── 跑对照实验 ──────────────────────────────────────
console.log("对照 A:不处理背压,数据在内存里堆积……");
const peakA = await withoutBackpressure();
console.log(`   内存堆积峰值:${(peakA / 1024 / 1024).toFixed(2)} MB  ← 汉堡塌了一地\n`);

console.log("实验 B:write() 返回 false 就 pause,drain 后 resume……");
const peakB = await withBackpressure();
console.log(`   内存堆积峰值:${(peakB / 1024 / 1024).toFixed(2)} MB  ← 窗口始终可控\n`);

console.log(`结果:背压把内存峰值从 ${(peakA / 1024 / 1024).toFixed(1)}MB 压到 ${(peakB / 1024 / 1024).toFixed(2)}MB`);
console.log("💡 背压不是 bug,是慢消费者的自我保护:问题不是吃得慢,是塞得快还不停。");
console.log("✅ 实验 2 完成");
