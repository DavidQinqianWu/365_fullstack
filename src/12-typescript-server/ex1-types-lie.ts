// 习题 1:类型会骗人 —— TS 类型在编译后消失,运行时外部输入全是 unknown
//
// 跑:npx tsx src/12-typescript-server/ex1-types-lie.ts
// (这个文件能通过根目录 npm run typecheck —— 编译器一个错都没报,但运行时会出事)
//
// ✍️ 预测(先写在 notes.md 的预测区,再运行):
//   1. 第 1 幕 `as Task` 之后调用 task.title.toUpperCase(),会打印什么?
//   2. 第 2 幕 PORT=3000 时,`port + 1` 是 3001 吗?Boolean('false') 是什么?
//   3. 第 3 幕同一个坏数据,用 unknown + 手写类型守卫处理,会崩吗?
//   4. 第 4 幕如果在 else 分支里写 r.value,编译器会怎样?

type Task = { id: number; title: string };

console.log("========== 第 1 幕:as 只是对编译器说「相信我」 ==========");
// 想象这是 POST 请求体 / 第三方 API 的响应:你说了不算,对方发什么就是什么
const body = '{"id": 1, "name": "字段名写错了"}';
const task = JSON.parse(body) as Task; // JSON.parse 返回 any,as 让编译器闭嘴,不做任何检查
console.log("task.title =", task.title); // undefined,编译器以为是 string
try {
  console.log(task.title.toUpperCase());
} catch (e) {
  console.log("💥 运行时崩了:", (e as Error).message);
}

console.log("\n========== 第 2 幕:process.env 里永远是字符串 ==========");
process.env.PORT = "3000";
process.env.LOG_REQUESTS = "false";
const port = process.env.PORT; // 类型是 string | undefined,不是 number
console.log("port + 1 =", port + 1); // 字符串拼接
console.log("Number(port) + 1 =", Number(port) + 1);
console.log("Boolean(process.env.LOG_REQUESTS) =", Boolean(process.env.LOG_REQUESTS)); // 非空字符串都是 true
console.log("process.env.NOT_SET =", process.env.NOT_SET);

console.log("\n========== 第 3 幕:unknown + 类型守卫:先验货,再当 Task 用 ==========");
function isTask(x: unknown): x is Task {
  return (
    typeof x === "object" && x !== null &&
    typeof (x as Record<string, unknown>).id === "number" &&
    typeof (x as Record<string, unknown>).title === "string"
  );
}
const raw: unknown = JSON.parse(body); // 用 unknown 接住:不检查就什么都不能做
// raw.title  ← 这样写编译不通过:'raw' is of type 'unknown'
if (isTask(raw)) {
  console.log("是 Task:", raw.title.toUpperCase()); // 守卫之后,raw 被收窄成 Task
} else {
  console.log("❌ 不是 Task,拒收:", JSON.stringify(raw));
}

console.log("\n========== 第 4 幕:discriminated union —— 用 ok 字段区分成功和失败 ==========");
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function parseTask(text: string): Result<Task> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "不是合法 JSON" };
  }
  return isTask(data) ? { ok: true, value: data } : { ok: false, error: "字段不对" };
}

for (const input of ['{"id":2,"title":"学 zod"}', body, "{坏 json"]) {
  const r = parseTask(input);
  // 判断 r.ok 之后,TS 知道这一支里有 value(或 error),另一个字段根本访问不到
  if (r.ok) console.log("  ✅", r.value.title);
  else console.log("  ❌", r.error);
}
