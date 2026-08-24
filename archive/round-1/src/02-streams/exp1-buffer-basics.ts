// Day 2 · 实验 1:Buffer 基础 —— 字节、字符、编码
// 运行:node src/02-streams/exp1-buffer-basics.ts

import assert from "node:assert/strict";

// ── 1. 字节 ≠ 字符 ─────────────────────────────────
// 「糖果 vs 糖纸」:1 个汉字 UTF-8 编码占 3 个字节
const s = "中文";
const buf = Buffer.from(s);
console.log("1. 字节 ≠ 字符");
console.log(`   "${s}".length              = ${s.length}   (字符:2 颗糖果)`);
console.log(`   Buffer.from("${s}").length = ${buf.length}   (字节:6 张糖纸)`);
assert.equal(s.length, 2);
assert.equal(buf.length, 6);

// 按字节截断字符串 → 把汉字切两半 → 乱码(糖果被撕开)
const cut = buf.subarray(0, 4).toString(); // 只取前 4 个字节
console.log(`   截断前 4 字节再 toString() = "${cut}"  ← 半个汉字变成乱码`);

// ── 2. encoding 只是「解释方式」─────────────────────
// 同一块字节,按不同编码读出来完全不同
console.log("\n2. encoding 只是解释方式");
const raw = Buffer.from("hello", "utf8");
console.log(`   utf8   : "${raw.toString("utf8")}"`);
console.log(`   hex    : "${raw.toString("hex")}"`);
console.log(`   base64 : "${raw.toString("base64")}"`);
// 反向:从 base64 解码回字节
const decoded = Buffer.from("aGVsbG8=", "base64");
console.log(`   base64 "aGVsbG8=" 解码后 = "${decoded.toString()}"`);
assert.equal(decoded.toString(), "hello");

// ── 3. alloc vs allocUnsafe vs from ─────────────────
console.log("\n3. alloc / allocUnsafe / from");
const clean = Buffer.alloc(8);
console.log(`   alloc(8)      = [${[...clean].join(", ")}]  ← 填零,干净`);

const dirty = Buffer.allocUnsafe(8);
console.log(`   allocUnsafe(8)= [${[...dirty].join(", ")}]  ← 可能有残留旧数据,必须全部覆写后再用`);
dirty.fill(0); // 用之前先擦干净

const fromStr = Buffer.from("abc");
console.log(`   from("abc")   = [${[...fromStr].join(", ")}]  ← 正好是 'a'=97 'b'=98 'c'=99`);
assert.deepEqual([...fromStr], [97, 98, 99]);

// ── 4. 长度固定:鸡蛋盒买定离手 ──────────────────────
console.log("\n4. Buffer 长度创建后不可变");
console.log(`   clean.length = ${clean.length},想装更多只能 concat 出一个新盒子`);

// ── 5. concat:stream 攒 chunk 的标准做法 ────────────
console.log("\n5. concat 拼接(模拟 stream 攒 chunk)");
const chunks = [Buffer.from("Hello"), Buffer.from(", "), Buffer.from("Stream!")];
const total = chunks.reduce((n, c) => n + c.length, 0);
const joined = Buffer.concat(chunks, total); // 先算总长度再一次性拼,避免反复拷贝
console.log(`   3 块拼起来 = "${joined.toString()}"`);
assert.equal(joined.toString(), "Hello, Stream!");

// ── 6. 堆外内存 ─────────────────────────────────────
console.log("\n6. Buffer 分配在 V8 堆外");
console.log(`   Buffer.poolSize = ${Buffer.poolSize} 字节(小 Buffer 共用这个 8KB 池)`);
console.log("   大 Buffer 直接占系统内存,不受 --max-old-space-size 限制");

console.log("\n✅ 实验 1 全部断言通过");
