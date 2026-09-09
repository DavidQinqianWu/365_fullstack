// 习题 1:绕过 node:http,用最底层的 TCP 看浏览器的原话
//
// 跑:node src/06-http-server/ex1-raw-tcp.ts
// 然后:
//   浏览器打开 http://localhost:3100/hello?name=david
//   终端执行  curl -X POST -d "a=1" http://localhost:3100/submit
import net from "node:net";

const PORT = Number(process.env.PORT ?? 3100); // 3000 常被别的项目占用

const BODY = "hello world!";

const server = net.createServer((socket) => {
  socket.on("data", (chunk) => {
    console.log("\n========== 客户端发来的原始字节 ==========");
    console.log(JSON.stringify(chunk.toString()).slice(0, 80) + " ...(下面是可读版)");
    console.log("------------------------------------------");
    console.log(chunk.toString());
    console.log("========== 报文结束 ==========\n");

    // 手写一张 HTTP 响应纸条。注意每行结尾是 \r\n,不是 \n
    const headers = [
      "HTTP/1.1 200 OK",
      "Content-Type: text/plain; charset=utf-8",
      `Content-Length: ${Buffer.byteLength(BODY)}`, // ← Q3 把这里改成 5 试试
      "Connection: close",
      "", // ← 空行:告诉对方「头写完了,下面是 body」
      "",
    ].join("\r\n"); // ← Q4 把 \r\n 换成 \n 试试

    socket.end(headers + BODY);
  });
});

server.listen(PORT, () => {
  console.log("裸 TCP 服务器已启动: http://localhost:3100");
  console.log("试试: 浏览器访问 /hello?name=david,再用 curl -X POST -d 'a=1' http://localhost:3100/submit");
  console.log("按 Ctrl+C 退出\n");
});
