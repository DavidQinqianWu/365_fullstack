// Day 1 · 习题 2:服务员不等待 —— 同步读 vs 异步读
// 目标:体会「站着等后厨」和「递完单子去服务下一桌」的区别
// 运行:npx tsx src/01-concurrency-models/ex2-io-waiting.ts
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createFile, cleanupFile, BIG_FILE } from "./helper-bigfile.js";

// 先造一个 200MB 的大文件当"慢后厨"(只造一次,已存在则跳过)
await createFile();

// ---------- 版本 A:同步读(服务员站着等) ----------
console.time("A 同步读文件");
// TODO:用 readFileSync 读 BIG_FILE
console.timeEnd("A 同步读文件");
console.log("A 读完后服务员才能做这件事 👋");

// ---------- 版本 B:异步读(递单后去招呼别人) ----------
console.time("B 异步读文件");
// TODO:用 await readFile 读 BIG_FILE
console.timeEnd("B 异步读文件");
console.log("B 读完了 🎉");

await cleanupFile();

// 思考题(写在 notes.md):
// 1. 版本 A 的"👋"和版本 B 的"🎉"打印顺序说明了什么?
// 2. 这段代码翻成 C# 就是 File.ReadAllText vs await File.ReadAllTextAsync ——
//    概念上有区别吗?底层被"让出"的东西一样吗?
