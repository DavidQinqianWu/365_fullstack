# nest-lab 错误类型目录(Problem Types)

> 所有错误响应都是 RFC 9457 Problem Details:`Content-Type: application/problem+json`。
> 这一页就是每个 `type` URI「指向的说明文档」。代码里的唯一来源:`src/common/problems/problem-types.ts`。
> `https://nest-lab.example/` 是占位域名(RFC 2606 保留的 example 域名),真正上线时换成自己的文档站。

## 通用字段

| 字段 | 含义 | 例子 |
|---|---|---|
| `type` | 错误类别的 URI,调用方用它判断「是哪一类错误」 | `https://nest-lab.example/problems/not-found` |
| `title` | 这一类错误的固定标题,同一个 `type` 永远相同 | `资源不存在` |
| `status` | HTTP 状态码,和响应行一致 | `404` |
| `detail` | 这一次具体发生了什么,给人看的 | `没有 id 为 999 的任务` |
| `instance` | 这一次出错的请求路径 | `/tasks/999` |
| `requestId` | 扩展字段:请求 ID,和响应头 `x-request-id` 相同;报错时请附上它 | `7c1e…` |
| `errors` | 扩展字段(仅 `validation-error`):字段级错误列表,`pointer` 是 JSON Pointer | `[{"pointer":"#/title","detail":"…"}]` |

## 错误类别

| type(省略前缀 `https://nest-lab.example/problems/`) | status | title | 什么时候出现 | 调用方该怎么做 |
|---|---|---|---|---|
| `bad-request` | 400 | 请求格式错误 | 请求体不是合法 JSON;路径参数格式不对(如 `/tasks/abc`) | 修正请求的拼装代码;不要原样重试 |
| `invalid-cursor` | 400 | 分页 cursor 无效 | cursor 被篡改 / 无法解析,或者和当前的 `sort`、过滤条件不匹配(Day 19) | 丢掉旧 cursor,从第一页重新开始 |
| `forbidden` | 403 | 没有权限执行此操作 | 缺少或错误的 `x-demo-key`;角色不够(`x-demo-role`) | 检查凭证 / 角色(Week 10 换成 JWT 后会区分 401) |
| `not-found` | 404 | 资源不存在 | 任务 id 不存在;路由不存在 | 刷新列表;检查 URL |
| `method-not-allowed` | 405 | 该资源不支持此 HTTP 方法 | 例如 `PATCH /tasks`;响应头 `Allow` 列出了支持的方法 | 按 `Allow` 改用正确的方法 |
| `not-acceptable` | 406 | 无法提供客户端要求的响应格式 | `Accept` 里没有 JSON | 接受 `application/json` |
| `conflict/task-completed` | 409 | 已完成的任务不能修改标题 | 对 `done: true` 的任务改标题,且没有同时把 `done` 改回 `false` | 先重新打开任务,或在同一个请求里带上 `done: false` |
| `conflict/stale-version` | 409 | 任务已被其他请求修改 | PUT / PATCH 请求体带了 `version`,但任务在你读取之后已经被改过(当前版本号不同);或者没带 `version`、服务器连续几次重读重写都被别的请求抢先(极少见)。Day 40 新增 | **不要原样重试**(那等于覆盖别人的修改):重新 GET 拿到最新内容和 `version`,让用户确认或合并后再提交 |
| `conflict` | 409 | 与资源当前状态冲突 | 其他未细分的状态冲突(预留) | 重新获取资源最新状态后再决定 |
| `unsupported-media-type` | 415 | 不支持的请求体格式 | 写请求的 `Content-Type` 不是 `application/json` | 改为发送 JSON |
| `validation-error` | 422 | 请求内容未通过校验 | JSON 合法,但字段不符合规则;见 `errors` | 按 `errors[].pointer` 把错误显示到对应输入框 |
| `internal` | 500 | 服务器内部错误 | 服务器代码出错;响应里不含任何内部细节 | 稍后重试;持续出现时带上 `requestId` 联系维护者 |
| `about:blank` | 其他 | 状态码的标准名称 | 目录里没有登记的状态码 | 按状态码的通用语义处理 |

## 约定

- `type` 和 `title` 是对外契约:**只增不改**。要改语义就新建一个 `type`。
- `title` 里不放具体信息(id、字段名、数值),这些放 `detail` 或扩展字段,这样才能按类别统计和告警。
- 5xx 的 `detail` 永远是固定的通用说明,真实原因只写进服务端日志(按 `requestId` 查)。
- 扩展字段用小驼峰,不和标准字段重名。
