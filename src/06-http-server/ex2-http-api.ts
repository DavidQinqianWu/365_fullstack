// 习题 2:不用任何框架,用 node:http 写一个真 API
//
// 跑:node src/06-http-server/ex2-http-api.ts
// 测试:
//   curl -i localhost:3100/tasks
//   curl -i "localhost:3100/tasks?done=true"
//   curl -i localhost:3100/tasks/1
//   curl -i -X POST localhost:3100/tasks -H "Content-Type: application/json" -d '{"title":"学 HTTP"}'
//   curl -i -X POST localhost:3100/tasks -H "Content-Type: application/json" -d '{"title":""}'
//   curl -i -X DELETE localhost:3100/tasks/1
import http from "node:http";

const PORT = Number(process.env.PORT ?? 3100); // 3000 常被别的项目占用

type Task = { id: number; title: string; done: boolean };

let tasks: Task[] = [
  { id: 1, title: "读懂 HTTP 报文", done: true },
  { id: 2, title: "手写一个 API", done: false },
];
let nextId = 3;

// ---------- 小工具:统一的响应写法 ----------

function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body), // 中文要按字节算
  });
  res.end(body);
}

/** RFC 9457 problem+json —— 错误响应的国际标准格式 */
function sendProblem(
  res: http.ServerResponse,
  status: number,
  title: string,
  detail: string,
  extra: Record<string, unknown> = {},
): void {
  const body = JSON.stringify({ type: "about:blank", title, status, detail, ...extra });
  res.writeHead(status, {
    "Content-Type": "application/problem+json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

/** 把请求体读成 JSON。注意:这里为了教学用了「攒到内存」的写法 —— 生产环境要限大小! */
function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > 1024 * 1024) {
        reject(new Error("body too large")); // ← Day 3 的教训:永远要设上限
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

// ---------- 四个处理函数,已经写好 ----------

function listTasks(res: http.ServerResponse, query: URLSearchParams): void {
  const done = query.get("done");
  const result = done === null ? tasks : tasks.filter((t) => String(t.done) === done);
  sendJson(res, 200, result);
}

function getTask(res: http.ServerResponse, id: number): void {
  const task = tasks.find((t) => t.id === id);
  if (!task) return sendProblem(res, 404, "Not Found", `没有 id 为 ${id} 的任务`);
  sendJson(res, 200, task);
}

async function createTask(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const body = (await readJsonBody(req)) as { title?: string };
  if (!body.title?.trim()) {
    return sendProblem(res, 422, "Validation failed", "title 不能为空", {
      errors: [{ field: "title", message: "must not be empty" }],
    });
  }
  const task: Task = { id: nextId++, title: body.title.trim(), done: false };
  tasks.push(task);
  // 201 Created 应该带 Location 头,告诉客户端新资源在哪
  res.writeHead(201, { "Content-Type": "application/json; charset=utf-8", Location: `/tasks/${task.id}` });
  res.end(JSON.stringify(task));
}

function deleteTask(res: http.ServerResponse, id: number): void {
  const before = tasks.length;
  tasks = tasks.filter((t) => t.id !== id);
  if (tasks.length === before) return sendProblem(res, 404, "Not Found", `没有 id 为 ${id} 的任务`);
  res.writeHead(204); // 204 No Content:成功,但没有内容
  res.end();          // 204 的响应体必须是空的
}

// ---------- 路由分发 ----------

const server = http.createServer(async (req, res) => {
  // req.url 只有路径和 query,没有域名。所以要拼一个假的 base 才能用 URL 解析
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method ?? "GET";

  console.log(`${method} ${req.url}`);

  try {
    // ============================================================
    // TODO(你来写,约 12-18 行):路由分发
    //
    // 要做的事:看 method 和 path,调用上面四个处理函数中正确的那个。
    //
    // 路由表:
    //   GET    /tasks       → listTasks(res, url.searchParams)
    //   GET    /tasks/:id   → getTask(res, id)
    //   POST   /tasks       → await createTask(req, res)
    //   DELETE /tasks/:id   → deleteTask(res, id)
    //   其他                 → sendProblem(res, 404, "Not Found", "路由不存在")
    //
    // 要想清楚的三件事(这就是 Express 帮你做掉的部分):
    //   1. /tasks/:id 里的 id 怎么取出来?path 是一个字符串,你要自己切。
    //   2. /tasks/abc 怎么办?id 不是数字时,该 404 还是 400?
    //   3. 同一个路径 /tasks,GET 和 POST 行为完全不同 —— 先判断路径还是先判断方法?
    //      两种写法都能用,但哪种在路由变多以后更好读?
    // ============================================================
    throw new Error("请先实现路由分发 —— 见上方 TODO");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    if (msg === "invalid json") return sendProblem(res, 400, "Bad Request", "请求体不是合法 JSON");
    if (msg === "body too large") return sendProblem(res, 413, "Payload Too Large", "请求体超过 1MB");
    console.error(err);
    sendProblem(res, 500, "Internal Server Error", "服务器内部错误"); // 5xx = 我的锅
  }
});

server.listen(PORT, () => console.log("API 已启动: http://localhost:3100/tasks\n"));
