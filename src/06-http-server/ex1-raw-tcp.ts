/**
 * Day 6 习题 1:绕过 node:http,用最底层的 TCP 看客人的「点菜单」原文
 *
 * 运行:npx tsx src/06-http-server/ex1-raw-tcp.ts
 * (脚本自导自演:起一个裸 TCP 服务器 → 自己当客人发请求 → 打印双方原话 → 自动退出)
 *
 * Part A:用 fetch(Node 内置的 HTTP 客户端,和浏览器同一套 API)发一个 POST,看它实际发出去的字节
 * Part B:不用任何 HTTP 库,用 net.connect 手打一张「点菜单」发过去,看服务器回的原始字节
 * Part C:服务器在 Content-Length 上撒谎(写 5,实际发 12 个字节),看客户端收到什么
 *
 * ✍️ 预测(先写再运行):
 *   1. fetch 发的 POST 请求,第一行长什么样?你没写任何 header,它会自己带上哪几个 header?
 *      我的预测:
 *   2. 头和体之间靠什么分隔?每行结尾是 \n 还是别的?
 *      我的预测:
 *   3. Part C 里服务器说「Content-Length: 5」,实际发了 "hello world!"(12 字节),客户端收到什么?
 *      我的预测:
 *
 * 选做(不计时):脚本末尾有一行注释,改成 KEEP_OPEN=1 运行可以让服务器不退出,
 * 你再用浏览器打开 http://localhost:3100/hello?name=david 或 curl -X POST -d "a=1" localhost:3100/submit,
 * 对比浏览器、curl、fetch 三位客人的「点菜单」有哪些不同。
 */

import net from "node:net";
import type { AddressInfo } from "node:net";

const KEEP_OPEN = process.env.KEEP_OPEN === "1";
const PORT = KEEP_OPEN ? Number(process.env.PORT ?? 3100) : 0; // 0 = 让系统随便给一个空闲端口

/** 把 \r \n 显形,方便看清每一行到底怎么结尾 */
const show = (s: string) => s.replaceAll("\r", "\\r").replaceAll("\n", "\\n\n");

let lieAboutLength = false; // Part C 打开:Content-Length 撒谎

const server = net.createServer((socket) => {
  socket.once("data", (chunk) => {
    console.log("  ┌─ 服务器收到的原始字节(\\r\\n 已显形)");
    console.log(
      show(chunk.toString())
        .split("\n")
        .map((l) => "  │ " + l)
        .join("\n"),
    );
    console.log("  └─ 报文结束");

    const BODY = "hello world!";
    // 手写一张「回执单」。每行结尾必须是 \r\n
    const head = [
      "HTTP/1.1 200 OK",
      "Content-Type: text/plain; charset=utf-8",
      `Content-Length: ${lieAboutLength ? 5 : Buffer.byteLength(BODY)}`,
      "Connection: close",
      "", // ← 空行:告诉对方「头写完了,下面是体」
      "",
    ].join("\r\n");
    socket.end(head + BODY);
  });
});

await new Promise<void>((r) => server.listen(PORT, r));
const port = (server.address() as AddressInfo).port;

if (KEEP_OPEN) {
  console.log(`裸 TCP 服务器已启动: http://localhost:${port}  (Ctrl+C 退出)`);
} else {
  // ---------- Part A:fetch 发 POST ----------
  console.log("\n===== Part A:fetch 发一个 POST,它到底说了什么? =====");
  const resA = await fetch(`http://localhost:${port}/tasks?from=fetch`, {
    method: "POST",
    body: JSON.stringify({ title: "学 HTTP" }),
  });
  console.log(`  fetch 拿到:status=${resA.status}  body=${JSON.stringify(await resA.text())}`);

  // ---------- Part B:手打一张点菜单 ----------
  console.log("\n===== Part B:不用 HTTP 库,用 TCP 手打一张点菜单 =====");
  const raw = "GET /hello?name=david HTTP/1.1\r\nHost: localhost\r\n\r\n";
  const reply = await new Promise<string>((resolve) => {
    const c = net.connect(port, "localhost", () => c.write(raw));
    let buf = "";
    c.on("data", (d) => (buf += d.toString()));
    c.on("end", () => resolve(buf));
  });
  console.log("  ┌─ 客户端收到的原始回执单");
  console.log(
    show(reply)
      .split("\n")
      .map((l) => "  │ " + l)
      .join("\n"),
  );
  console.log("  └─ 回执单结束");

  // ---------- Part C:Content-Length 撒谎 ----------
  console.log("\n===== Part C:服务器说 Content-Length: 5,实际发了 12 字节 =====");
  lieAboutLength = true;
  const resC = await fetch(`http://localhost:${port}/lie`);
  console.log(`  fetch 拿到的 body = ${JSON.stringify(await resC.text())}`);

  server.close();
}

/**
 * 思考题(答案写进 notes.md):
 * 1. 一张 HTTP 请求的点菜单由哪四部分组成?服务器怎么知道「头写完了」?怎么知道「体写完了」?
 * 2. Part B 你只写了两行字,服务器就照样回了 200。这说明「Web 服务器」本质上是个什么程序?
 * 3. Part C 里多出来的 7 个字节去哪了?如果连接是 keep-alive(不关),这 7 个字节会被误当成什么?
 */
