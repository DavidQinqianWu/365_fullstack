/**
 * Day 4 习题 3:cluster —— 一个门牌号,开四家分店
 *
 * 运行:npx tsx src/04-process-model/ex3-cluster-http.ts
 *
 * 场景:单进程 HTTP 服务只用一颗核,而且一崩全站歇业。
 * cluster 的做法:
 *   - primary(店长):不管客人,只负责开分店、盯着分店死活
 *   - worker(分店):N 个一模一样的服务进程,共享同一个端口(同一个门牌号)
 *
 * 脚本会自导自演:
 *   1. 店长开 4 家分店 → 2. 自己打 8 个请求,看谁接单 → 3. 枪毙一家分店,观察店长原地重开 → 4. 全体打烊
 *
 * ✍️ 预测(先写再运行):
 *   1. 8 个请求会由几个不同的 PID 处理?
 *      我的预测:
 *   2. 杀掉一个 worker 后,紧接着的请求会失败吗?
 *      我的预测:
 */

import cluster from "node:cluster";
import http from "node:http";
import { availableParallelism } from "node:os";

const PORT = 3456;
const WORKER_COUNT = Math.min(4, availableParallelism());

if (cluster.isPrimary) {
  // ---------- 店长 ----------
  console.log(`👔 店长(PID ${process.pid})上岗,这台机器有 ${availableParallelism()} 颗核,开 ${WORKER_COUNT} 家分店`);

  for (let i = 0; i < WORKER_COUNT; i++) cluster.fork();

  // 分店倒闭 → 原地重开(崩溃自愈的雏形)
  cluster.on("exit", (worker, code, signal) => {
    console.log(`\n💀 分店 ${worker.process.pid} 倒闭了(signal=${signal}),店长立刻重开一家`);
    cluster.fork();
  });

  let readyCount = 0;
  cluster.on("listening", () => {
    readyCount++;
    if (readyCount === WORKER_COUNT) runSelfTest();
  });

  // 自导自演:打 8 个请求 → 杀一家分店 → 再打 4 个 → 打烊
  async function runSelfTest() {
    await sleep(300); // 等所有分店把门开好

    console.log("\n--- 打 8 个请求,看是谁接的单 ---");
    for (let i = 0; i < 8; i++) {
      const pid = await ask();
      console.log(`请求 ${i + 1} → 分店 PID ${pid} 接单`);
    }

    const victim = Object.values(cluster.workers!)[0]!;
    const victimPid = victim.process.pid!;
    console.log(`\n--- 枪毙分店 ${victimPid}(SIGTERM)---`);
    victim.process.kill("SIGTERM");

    await sleep(800); // 等店长重开

    console.log("\n--- 再打 4 个请求,服务中断了吗?---");
    for (let i = 0; i < 4; i++) {
      const pid = await ask();
      console.log(`请求 ${i + 1} → 分店 PID ${pid} 接单`);
    }

    console.log("\n🧹 打烊:全部 worker 退场,店长下班");
    for (const w of Object.values(cluster.workers!)) w?.process.kill("SIGTERM");
    process.exit(0);
  }

  function ask(): Promise<string> {
    return new Promise((resolve, reject) => {
      // agent:false 关掉 keep-alive 连接复用,让每个请求都是一条新连接,
      // 才能看到店长 round-robin 把连接分给不同分店
      http.get({ port: PORT, path: "/", agent: false }, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve(body));
      }).on("error", reject);
    });
  }

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
} else {
  // ---------- 分店 ----------
  http
    .createServer((req, res) => {
      res.end(String(process.pid)); // 回自己的 PID,让客人知道是谁端的菜
    })
    .listen(PORT); // 神奇之处:4 个进程 listen 同一个端口,不冲突
}

/**
 * 思考题(答案写进 notes.md):
 * 1. 4 个进程 listen 同一个端口为什么不报 EADDRINUSE?谁真正持有这个 socket?
 * 2. 为什么 primary 里不处理任何请求,只负责 fork 和重开?让它也接单会有什么风险?
 * 3. cluster 的"崩溃重开"和 PM2 / systemd / k8s 的 restart policy 是什么关系?生产上该用哪层?
 * 4. 如果请求处理里用了内存中的 Map 做缓存,4 家分店各自的缓存一致吗?这说明什么?
 */
