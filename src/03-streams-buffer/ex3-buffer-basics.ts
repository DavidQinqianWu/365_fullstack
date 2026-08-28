// Day 3 习题 3:Buffer 五连 —— 字节周转箱的脾气
//
// 每一组先读注释里的问题,把预测写在 ✍️ 后面,再运行对照。
// 运行:npx tsx src/03-streams-buffer/ex3-buffer-basics.ts

// ── ① 字节数 ≠ 字符数 ────────────────────────────────────────
// ✍️ 预测:"你好" 的 length 是几?Buffer.from("你好") 的 length 是几?
const s = "你好";
const b1 = Buffer.from(s, "utf8");
console.log("① 字符串 length:", s.length, "| Buffer length(字节数):", b1.length);

// ── ② 周转箱是固定大小的 ────────────────────────────────────
// ✍️ 预测:alloc(4) 的箱子装进 "hello"(5 字节)会怎样?
const box = Buffer.alloc(4);
Buffer.from("hello").copy(box);
console.log("② 4 字节箱子装 hello 的结果:", box.toString());

// ── ③ slice 是"隔板",不是"复印" ────────────────────────────
// ✍️ 预测:改了 slice 出来的小块,原 Buffer 会变吗?
const original = Buffer.from("abcdef");
const part = original.subarray(0, 3); // slice 的新名字,指向同一块内存
part[0] = "Z".charCodeAt(0);
console.log("③ 改完隔间后原箱子:", original.toString(), "← 预测对了吗?");

// ── ④ concat 才是"复印+合并" ─────────────────────────────────
// ✍️ 预测:concat 之后改合并结果,会影响原来的两个吗?
const x = Buffer.from("ab");
const y = Buffer.from("cd");
const merged = Buffer.concat([x, y]);
merged[0] = "Z".charCodeAt(0);
console.log("④ concat 后改合并结果,原 x 还是:", x.toString());

// ── ⑤ 编码:同一箱字节,两种读法 ─────────────────────────────
// ✍️ 预测:utf8 编码的 "中" 按 latin1 读出来还是 "中" 吗?
const zhong = Buffer.from("中", "utf8");
console.log("⑤ 字节:", zhong, "| 按 latin1 误读:", zhong.toString("latin1"));

// 思考(写进 notes.md):为什么 stream 交接的每块 chunk 是 Buffer 而不是 string?
