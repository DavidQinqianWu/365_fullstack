/**
 * Day 6 习题 3:req/res 就是 Day 3 的流 —— Content-Length、chunked、keep-alive、流式下载
 *
 * 运行:npx tsx src/06-http-server/ex3-headers-and-streams.ts
 * (脚本自导自演:起服务器 → 自己发请求 → 打印 → 自动退出;第一次运行会在系统临时目录生成一个 100MB 测试文件)
 *
 * 实验 1:返回一句中文,Content-Length 分别用 str.length(字符数)和 Buffer.byteLength(字节数)
 * 实验 2:不写 Content-Length,每 200ms 写一行(边做边上菜),看响应头里多了什么
 * 实验 3:同一个 keep-alive 客户端连发 3 个请求,看服务器那边是不是同一条连接
 * 实验 4:发 100MB 文件,流式 pipe vs 一次性 readFileSync,看服务器进程内存涨多少
 *
 * ✍️ 预测(先写再运行):
 *   1. TEXT = "你好,HTTP!" 的 length 是多少?字节数是多少?用 length 当 Content-Length,客户端收到什么?
 *      我的预测:
 *   2. 不写 Content-Length 时,Node 会自动在响应头里加哪一行?
 *      我的预测:
 *   3. keep-alive 连发 3 个请求,服务器看到几条不同的 TCP 连接?
 *      我的预测:
 *   4. 发 100MB:流式时内存大约涨多少?一次性读进内存时涨多少?
 *      我的预测:
 */

import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";

const TEXT = "你好,HTTP!";
const BIG_FILE = path.join(os.tmpdir(), "day6-100mb.bin");
if (!fs.existsSync(BIG_FILE)) fs.writeFileSync(BIG_FILE, Buffer.alloc(100 * 1024 * 1024, 0x41));

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`;
const rss = () => process.memoryUsage().rss;
const memLog: string[] = [];

const server = http.createServer((req, res) => {
  switch (req.url) {
    case "/fixed-wrong": // ❌ 字符数
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Content-Length": TEXT.length });
      res.end(TEXT);
      break;
    case "/fixed-right": // ✅ 字节数
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Content-Length": Buffer.byteLength(TEXT) });
      res.end(TEXT);
      break;
    case "/chunked": {
      // 不写 Content-Length,边做边上菜
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      let i = 0;
      const timer = setInterval(() => {
        res.write(`第 ${++i} 盘\n`);
        if (i === 3) {
          clearInterval(timer);
          res.end("上齐了\n");
        }
      }, 200);
      break;
    }
    case "/whoami": // 告诉客人:你是从哪条连接(客户端端口)来的
      res.end(`你的连接来自端口 ${req.socket.remotePort}`);
      break;
    case "/download": {
      const before = rss();
      res.writeHead(200, { "Content-Length": fs.statSync(BIG_FILE).size });
      fs.createReadStream(BIG_FILE).pipe(res); // res 是 Writable,pipe 自带背压(Day 3)
      res.on("finish", () => memLog.push(`流式 pipe      :内存 ${mb(before)} → ${mb(rss())}`));
      break;
    }
    case "/download-bad": {
      const before = rss();
      const buf = fs.readFileSync(BIG_FILE); // ❌ 100MB 整个搬进内存
      res.writeHead(200, { "Content-Length": buf.length });
      res.end(buf);
      memLog.push(`一次性 readFile:内存 ${mb(before)} → ${mb(rss())}`);
      break;
    }
    default:
      res.writeHead(404).end();
  }
});

await new Promise<void>((r) => server.listen(0, r));
const port = (server.address() as AddressInfo).port;

type Got = { status: number; headers: http.IncomingHttpHeaders; body: Buffer; ms: number; err?: string };

/** 用 node:http 当客户端(比 fetch 更「老实」,出错会直接告诉你),返回状态、头、体、耗时、错误 */
function get(p: string, agent?: http.Agent) {
  return new Promise<Got>((resolve) => {
    const t = performance.now();
    const got: Got = { status: 0, headers: {}, body: Buffer.alloc(0), ms: 0 };
    const chunks: Buffer[] = [];
    let n = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      got.body = n ? Buffer.from(`(共收到 ${mb(n)})`) : Buffer.concat(chunks);
      got.ms = performance.now() - t;
      resolve(got);
    };
    const opts: http.RequestOptions = { port, path: p };
    if (agent) opts.agent = agent;
    const req = http.get(opts, (res) => {
      got.status = res.statusCode ?? 0;
      got.headers = res.headers;
      res.on("data", (c: Buffer) => {
        if (p.startsWith("/download")) n += c.length; // 大文件只数字节,不攒在客户端内存里
        else chunks.push(c);
      });
      res.on("end", finish);
    });
    req.on("error", (e) => {
      got.err = e.message;
      setTimeout(finish, 100); // 体可能已经收到一部分,稍等一下再收工
    });
  });
}

// ---------- 实验 1 ----------
console.log(`\n===== 实验 1:TEXT = "${TEXT}"  length=${TEXT.length}  字节数=${Buffer.byteLength(TEXT)} =====`);
for (const p of ["/fixed-wrong", "/fixed-right"]) {
  const r = await get(p);
  console.log(`  ${p.padEnd(13)} Content-Length=${r.headers["content-length"]}  客户端收到 ${JSON.stringify(r.body.toString("utf8"))}`);
  if (r.err) console.log(`  ${"".padEnd(13)} ⚠️ 客户端还报错:${r.err}`);
}

// ---------- 实验 2 ----------
console.log("\n===== 实验 2:不写 Content-Length =====");
const c = await get("/chunked");
console.log(`  content-length    = ${c.headers["content-length"] ?? "(没有)"}`);
console.log(`  transfer-encoding = ${c.headers["transfer-encoding"]}`);
console.log(`  体 = ${JSON.stringify(c.body.toString())}  (耗时 ${c.ms.toFixed(0)}ms,是一盘一盘到的)`);

// ---------- 实验 3 ----------
console.log("\n===== 实验 3:keep-alive vs 每次新连接 =====");
const keep = new http.Agent({ keepAlive: true, maxSockets: 1 });
const once = new http.Agent({ keepAlive: false });
for (const [label, agent] of [["keepAlive: true ", keep], ["keepAlive: false", once]] as const) {
  const ports: string[] = [];
  for (let i = 0; i < 3; i++) ports.push((await get("/whoami", agent)).body.toString().replace(/\D/g, ""));
  console.log(`  ${label} 连发 3 次 → 服务器看到的客户端端口:${ports.join(", ")}`);
}
keep.destroy();

// ---------- 实验 4 ----------
console.log("\n===== 实验 4:发 100MB 文件(看服务器进程内存) =====");
for (const p of ["/download", "/download-bad"]) {
  const r = await get(p);
  console.log(`  ${p.padEnd(13)} ${r.body.toString()},耗时 ${r.ms.toFixed(0)}ms`);
}
for (const line of memLog) console.log("  " + line);

server.close();

/**
 * 思考题(答案写进 notes.md):
 * 1. 实验 1 里 fixed-wrong 少收的那几个字节,是被谁「吃」掉的?为什么英文网站很少踩这个坑,中文网站一踩一个准?
 * 2. 什么场景下你在「开始上菜」时根本不知道总共有多少?(提示:AI 逐字回答、查数据库边查边吐)这时只能用哪种方式?
 * 3. 实验 4 里两种写法客户端都收到了 100MB,为什么服务器内存差这么多?如果 100 个人同时下载,哪种写法先把服务器撑爆?
 */
