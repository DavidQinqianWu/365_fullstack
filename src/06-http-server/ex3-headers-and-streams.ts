// 习题 3:Content-Length 的中文陷阱、chunked、流式下载
//
// 跑:node src/06-http-server/ex3-headers-and-streams.ts
// 用 curl -v 看响应头(-v 会打印出完整的请求和响应头):
//   curl -v localhost:3100/fixed-wrong
//   curl -v localhost:3100/fixed-right
//   curl -v localhost:3100/chunked
//   curl -v -o /dev/null localhost:3100/download
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.PORT ?? 3100); // 3000 常被别的项目占用

const TEXT = "你好,这是一段中文。Hello!";
const BIG_FILE = path.join(os.tmpdir(), "sfs-100mb.bin");

// 准备一个 100MB 的测试文件(只在第一次跑时生成)
if (!fs.existsSync(BIG_FILE)) {
  console.log("正在生成 100MB 测试文件...");
  fs.writeFileSync(BIG_FILE, Buffer.alloc(100 * 1024 * 1024, 0x41));
  console.log("生成完毕:", BIG_FILE);
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`;

const server = http.createServer((req, res) => {
  switch (req.url) {
    // --- 实验 1a:用 str.length 当 Content-Length(错的) ---
    case "/fixed-wrong": {
      console.log(`\n[/fixed-wrong] 字符数=${TEXT.length}  字节数=${Buffer.byteLength(TEXT)}  ← 不一样!`);
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Length": TEXT.length, // ❌ 字符数,不是字节数
      });
      res.end(TEXT);
      break;
    }

    // --- 实验 1b:用 Buffer.byteLength(对的) ---
    case "/fixed-right": {
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Length": Buffer.byteLength(TEXT), // ✅ 字节数
      });
      res.end(TEXT);
      break;
    }

    // --- 实验 2:不设 Content-Length,边做边发 ---
    case "/chunked": {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      let i = 0;
      const timer = setInterval(() => {
        res.write(`第 ${++i} 行,发送时间 ${new Date().toISOString()}\n`);
        if (i === 5) {
          clearInterval(timer);
          res.end("完毕\n");
        }
      }, 300);
      break;
    }

    // --- 实验 3:流式发 100MB,观察内存 ---
    case "/download": {
      const before = process.memoryUsage().rss;
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Length": fs.statSync(BIG_FILE).size,
      });
      fs.createReadStream(BIG_FILE).pipe(res); // ← Day 3 的流,一行搞定
      res.on("finish", () => {
        const after = process.memoryUsage().rss;
        console.log(`\n[/download 流式] 内存 ${mb(before)} → ${mb(after)}  涨了 ${mb(after - before)}`);
      });
      break;
    }

    // --- 实验 3 对照组:一次性读进内存再发(千万别在生产用) ---
    case "/download-bad": {
      const before = process.memoryUsage().rss;
      const buf = fs.readFileSync(BIG_FILE); // ❌ 100MB 直接进内存
      res.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Length": buf.length });
      res.end(buf);
      const after = process.memoryUsage().rss;
      console.log(`\n[/download-bad 一次性] 内存 ${mb(before)} → ${mb(after)}  涨了 ${mb(after - before)}`);
      break;
    }

    default:
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("试试 /fixed-wrong /fixed-right /chunked /download /download-bad\n");
  }
});

server.listen(PORT, () => {
  console.log(`
服务器已启动。用 curl -v 逐个试:

  curl -v localhost:3100/fixed-wrong     ← Q1 看 curl 报什么错
  curl -v localhost:3100/fixed-right
  curl -v localhost:3100/chunked         ← Q2 看响应头多了哪一行
  curl -v -o /dev/null localhost:3100/download       ← Q3 看终端打印的内存
  curl -v -o /dev/null localhost:3100/download-bad   ← Q3 对照组

按 Ctrl+C 退出
`);
});
