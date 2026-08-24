// Day 1 · 习题 2:服务员不等待 —— 同步读 vs 异步读
// 目标:体会「站着等后厨」和「递完单子去服务下一桌」的区别
// 运行:npx tsx src/01-concurrency-models/ex2-io-waiting.ts
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createFile, cleanupFile, BIG_FILE } from "./helper-bigfile.js";

// 先造一个 200MB 的大文件当"慢后厨"(只造一次,已存在则跳过)
await createFile();

// ---------- 版本 A:同步读(服务员站着等) ----------
// readFileSync 返回普通字符串,不是 Promise —— 同步 API 没有"可等待"的东西,
// 服务员没得选,只能站在原地等后厨。后面的代码物理上不可能提前执行。
console.time("A 同步读文件");
readFileSync(BIG_FILE, "utf-8");
console.timeEnd("A 同步读文件");
console.log("A 读完后服务员才能做这件事 👋");

// ---------- 版本 B:异步读(递单后去招呼别人) ----------
// 关键:递单(readFile)和取餐(await)之间插进别的活,
// 才能看到服务员在等待期间去干了别的事。
console.time("B 异步读文件");
const p = readFile(BIG_FILE, "utf-8"); // 递单,先不等
console.log("B 递完单子,服务员马上去招呼下一桌了 🏃"); // 会在读取完成前打印!
await p; // 后厨出餐了再回来取
console.timeEnd("B 异步读文件");
console.log("B 读完了 🎉");

await cleanupFile();

// 思考题(写在 notes.md):
// 1. 版本 B 的 🏃 抢在 🎉 前面打印,版本 A 却做不到 —— 这说明了什么?
// 2. 这段代码翻成 C# 就是 File.ReadAllText vs await File.ReadAllTextAsync ——
//    概念相同(递单不等待),但让出的东西不同:C# 让出线程池里众多线程之一,
//    Node 让出的是唯一的主线程。所以 I/O 写成同步,在 C# 是浪费,在 Node 是灾难。
