/**
 * Day 4 习题 1:exec vs spawn —— 外卖窗口 vs 传菜传送带
 *
 * 运行:npx tsx src/04-process-model/ex1-spawn-vs-exec.ts
 *
 * 同一个命令(打印约 6MB 输出),分别用 exec 和 spawn 启动子进程:
 *   - exec :把子进程全部输出攒进一个大 buffer,攒完一次性给你(外卖窗口:菜齐了一次端走)
 *   - spawn:输出是 stream,来一块给一块(传送带:边出边端)
 *
 * ✍️ 预测(先写再运行):
 *   1. exec 这次会成功吗?为什么?(提示:maxBuffer 默认 1MB)
 *      实测(参考答案):失败,报 "stdout maxBuffer length exceeded"。6MB 输出 > 默认 1MB 的攒单上限,exec 直接把子进程杀掉。
 *   2. spawn 处理同样输出时,主进程内存会涨到多少量级?
 *      实测(参考答案):只涨几 MB(实测 rss 82.6MB → 88.3MB,6.2MB 分成 829 块流过)。每块处理完就丢,内存和输出总量无关。
 */

import { exec, spawn } from "node:child_process";

// 让子进程打印 200_000 行,总量约 6MB
const PRINT_LOTS = `for (let i = 0; i < 200000; i++) console.log("line-" + i + "-" + "x".repeat(20));`;

function rssMB() {
  return (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
}

// ---------- 第一部分:exec —— 一次性攒全单 ----------
console.log("=== Part A: exec(外卖窗口,菜齐才端)===");

exec(`node -e '${PRINT_LOTS}'`, (err, stdout) => {
  if (err) {
    // 思考:这里的错误是什么?看 err.message 里的关键词
    console.log(`❌ exec 出错:${err.message.split("\n")[0]}`);
  } else {
    console.log(`✅ exec 成功,一次性收到 ${(stdout.length / 1024 / 1024).toFixed(1)}MB`);
  }
  console.log(`   主进程 rss:${rssMB()}MB\n`);

  // exec 完再跑 spawn,避免互相干扰
  partB();
});

// ---------- 第二部分:spawn —— 流水传送带 ----------
function partB() {
  console.log("=== Part B: spawn(传送带,边出边端)===");

  const child = spawn("node", ["-e", PRINT_LOTS]); // 注意:不走 shell,参数是数组

  let chunks = 0;
  let bytes = 0;
  child.stdout.on("data", (chunk: Buffer) => {
    chunks++;
    bytes += chunk.length;
  });

  child.on("close", (code) => {
    console.log(`✅ spawn 完成(退出码 ${code})`);
    console.log(`   共来 ${chunks} 块,合计 ${(bytes / 1024 / 1024).toFixed(1)}MB`);
    console.log(`   主进程 rss:${rssMB()}MB`);
    console.log(`   子进程 PID 是 ${child.pid},我自己是 ${process.pid} —— 两家独立的分店`);
  });
}

/**
 * 思考题(答案写进 notes.md):
 * 1. exec 的 maxBuffer 默认 1MB,调大它能"修复"exec 吗?为什么这只是把炸弹引线加长?
 * 2. spawn 不传 shell:true,所以参数是数组、不会经过 shell 解析 —— 这对安全意味着什么?
 *    (想想:如果文件名来自用户输入 "a.txt; rm -rf ~",exec 字符串拼接会发生什么?)
 * 3. 只想快速跑个小命令、输出就几行,该用哪个?为什么 exec 在小输出时依然合理?
 */
