/**
 * Day 6 习题 2:不用框架,用 node:http 写一个任务清单 API,猜它回什么状态码
 *
 * 运行:npx tsx src/06-http-server/ex2-http-api.ts
 * (脚本自导自演:起 API → 自己按顺序发 9 个请求 → 打印每个回执单的状态码 → 自动退出)
 *
 * 路由表(已经写好,先读一遍下面的 route() 函数,再做预测):
 *   GET    /tasks       → 200 全部任务(支持 ?done=true 过滤)
 *   GET    /tasks/:id   → 200 / 404
 *   POST   /tasks       → 201(带 Location 头)/ 422 title 为空 / 400 不是合法 JSON
 *   DELETE /tasks/:id   → 204 / 404
 *   其他                 → 404
 *
 * ✍️ 预测(先写再运行):在下面 9 个请求后面写上你猜的状态码
 *   ①  GET    /tasks                      我的预测:
 *   ②  GET    /tasks/99                   我的预测:
 *   ③  POST   /tasks  {"title":"学 HTTP"}  我的预测:          (还会多带哪个 header?)
 *   ④  POST   /tasks  {"title":"学 HTTP"}  (同样的请求再发一次,任务会变成几个?)我的预测:
 *   ⑤  POST   /tasks  {"title":""}        我的预测:
 *   ⑥  POST   /tasks  {title: 没引号}      我的预测:
 *   ⑦  DELETE /tasks/1                    我的预测:
 *   ⑧  DELETE /tasks/1(再删一次)         我的预测:          (状态码变了,服务器的「状态」变了吗?)
 *   ⑨  GET    /tasks/abc                  我的预测:
 *
 * 选做(不计时):KEEP_OPEN=1 npx tsx src/06-http-server/ex2-http-api.ts 让服务器常驻 3100 端口,
 * 用 curl -i localhost:3100/tasks 之类的命令自己玩(-i 会把响应头也打出来)。
 */

import http from "node:http";
import type { AddressInfo } from "node:net";

const KEEP_OPEN = process.env.KEEP_OPEN === "1";

type Task = { id: number; title: string; done: boolean };
let tasks: Task[] = [
  { id: 1, title: "读懂 HTTP 报文", done: true },
  { id: 2, title: "手写一个 API", done: false },
];
let nextId = 3;

// ---------- 小工具:统一的回执单写法 ----------
function sendJson(res: http.ServerResponse, status: number, data: unknown, extra: http.OutgoingHttpHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body), // 字节数,不是字符数(习题 3 细看)
    ...extra,
  });
  res.end(body);
}

/** 错误统一用 problem+json 格式(RFC 9457),Week 3 细讲,今天知道有这么个标准即可 */
function sendProblem(res: http.ServerResponse, status: number, title: string, detail: string) {
  const body = JSON.stringify({ type: "about:blank", title, status, detail });
  res.writeHead(status, {
    "Content-Type": "application/problem+json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

/** 把请求体(一条 Readable 流)读完再 JSON.parse。教学写法:攒内存,但设了 1MB 上限 */
async function readJson(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 1024 * 1024) throw new Error("too large"); // Day 3 的教训:永远设上限
    chunks.push(c as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")); // 不合法会抛 SyntaxError
}

// ---------- 路由分发:这就是 NestJS 的 @Controller / @Get / @Param 替你做掉的部分 ----------
async function route(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://placeholder"); // req.url 只有路径+query,要拼个 base 才能解析
  const method = req.method ?? "GET";
  const m = url.pathname.match(/^\/tasks(?:\/([^/]+))?$/); // /tasks 或 /tasks/:id
  if (!m) return sendProblem(res, 404, "Not Found", "路由不存在");

  const idText = m[1];
  if (idText === undefined) {
    // ----- /tasks -----
    if (method === "GET") {
      const done = url.searchParams.get("done");
      return sendJson(res, 200, done === null ? tasks : tasks.filter((t) => String(t.done) === done));
    }
    if (method === "POST") {
      let body: unknown;
      try {
        body = await readJson(req);
      } catch {
        return sendProblem(res, 400, "Bad Request", "请求体不是合法 JSON");
      }
      const title = typeof body === "object" && body !== null && "title" in body ? String(body.title).trim() : "";
      if (!title) return sendProblem(res, 422, "Validation failed", "title 不能为空");
      const task: Task = { id: nextId++, title, done: false };
      tasks.push(task);
      return sendJson(res, 201, task, { Location: `/tasks/${task.id}` }); // 201 要告诉客户端新资源在哪
    }
    return sendProblem(res, 405, "Method Not Allowed", `${method} /tasks 不支持`);
  }

  // ----- /tasks/:id -----
  const id = Number(idText);
  if (!Number.isInteger(id)) return sendProblem(res, 404, "Not Found", `没有 id 为 ${idText} 的任务`);
  if (method === "GET") {
    const task = tasks.find((t) => t.id === id);
    return task ? sendJson(res, 200, task) : sendProblem(res, 404, "Not Found", `没有 id 为 ${id} 的任务`);
  }
  if (method === "DELETE") {
    const before = tasks.length;
    tasks = tasks.filter((t) => t.id !== id);
    if (tasks.length === before) return sendProblem(res, 404, "Not Found", `没有 id 为 ${id} 的任务`);
    res.writeHead(204); // 204 No Content:成功了,但没东西给你
    return void res.end(); // 204 的体必须是空的
  }
  return sendProblem(res, 405, "Method Not Allowed", `${method} /tasks/:id 不支持`);
}

const server = http.createServer((req, res) => {
  route(req, res).catch((err: unknown) => {
    console.error(err);
    sendProblem(res, 500, "Internal Server Error", "服务器内部错误"); // 5xx = 店家的锅
  });
});

await new Promise<void>((r) => server.listen(KEEP_OPEN ? Number(process.env.PORT ?? 3100) : 0, r));
const base = `http://localhost:${(server.address() as AddressInfo).port}`;

if (KEEP_OPEN) {
  console.log(`API 已启动: ${base}/tasks  (Ctrl+C 退出)`);
} else {
  const calls: Array<[string, string, string?]> = [
    ["①", "GET /tasks"],
    ["②", "GET /tasks/99"],
    ["③", "POST /tasks", '{"title":"学 HTTP"}'],
    ["④", "POST /tasks", '{"title":"学 HTTP"}'],
    ["⑤", "POST /tasks", '{"title":""}'],
    ["⑥", "POST /tasks", "{title: 没引号}"],
    ["⑦", "DELETE /tasks/1"],
    ["⑧", "DELETE /tasks/1"],
    ["⑨", "GET /tasks/abc"],
  ];
  for (const [no, line, body] of calls) {
    const [method, path] = line.split(" ") as [string, string];
    const init: RequestInit = { method, headers: { "Content-Type": "application/json" } };
    if (body !== undefined) init.body = body;
    const res = await fetch(base + path, init);
    const text = await res.text();
    const loc = res.headers.get("location");
    console.log(
      `${no} ${line.padEnd(16)} → ${res.status} ${res.statusText.padEnd(21)}` +
        (loc ? ` Location: ${loc}` : "") +
        ` | ${res.headers.get("content-type") ?? "(无 Content-Type)"} | 体: ${text ? text.slice(0, 45) : "(空)"}`,
    );
  }
  console.log(`\n最后服务器里的任务:${JSON.stringify(tasks.map((t) => `${t.id}:${t.title}`))}`);
  server.close();
}

/**
 * 思考题(答案写进 notes.md):
 * 1. ③④ 一模一样的 POST 发了两次,结果多出几个任务?⑦⑧ 一模一样的 DELETE 发了两次,最终状态有区别吗?
 *    用这两组对比解释「幂等」,再说说:网络超时后,客户端敢不敢自动重试 POST?
 * 2. ⑤ 和 ⑥ 都是「客人的错」,为什么一个是 422 一个是 400?如果你把它们都写成 500,半夜谁会被叫醒?
 * 3. ⑨ /tasks/abc 我们回了 404,也有人主张回 400。你站哪边?理由?(没有标准答案,团队统一即可)
 * 4. 数一数 route() 里有多少行在做「切路径、取 id、判断方法、读 body、拼 JSON」——这些在 NestJS 里分别由谁替你做?
 */
