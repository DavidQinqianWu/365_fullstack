// Day 1 · 习题 2:服务员不等待 —— 同步读 vs 异步读
// 目标:体会「站着等后厨」和「递完单子去服务下一桌」的区别
// 运行:npx tsx src/01-concurrency-models/ex2-io-waiting.ts
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
// 注意:这里写真实的 .ts 扩展名,原生 node(24+ 类型擦除)和 tsx 都能正确解析;
// 若写 .js 则只有 tsx 能映射回 .ts,直接 node 跑会报 ERR_MODULE_NOT_FOUND
import { createFile, cleanupFile, BIG_FILE } from "./helper-bigfile.ts";

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
await p;
// 看起来像"站着等"
// 实际是:把后面的代码打包成一张纸条交给铃铛, 打包范围是"到当前函数末尾"。如果这段代码在一个 async function 里，函数外部的代码不会被包进去——函数会提前 return（返回一个 Promise)，外面的人照常往下跑。你这里写的是顶层代码，Node 把整个模块当成一个大 async 函数，所以一路打包到文件尾，正好包括 await cleanupFile()。
// 函数先退场,服务员继续巡视全场
console.timeEnd("B 异步读文件");
console.log("B 读完了 🎉");
await cleanupFile();

// 思考题(写在 notes.md):
// 1. 版本 B 的 🏃 抢在 🎉 前面打印,版本 A 却做不到 —— 这说明了什么?
// 答案: 说明了版本 B 是异步的,递完单子后服务员可以去做其他事情,而版本 A 是同步的,服务员必须等到读完文件才能继续做其他事情。

// 2. 这段代码翻成 C# 就是 File.ReadAllText vs await File.ReadAllTextAsync ——
//    概念相同(递单不等待),但让出的东西不同:C# 让出线程池里众多线程之一,
//    Node 让出的是唯一的主线程。所以 I/O 写成同步,在 C# 是浪费,在 Node 是灾难。
