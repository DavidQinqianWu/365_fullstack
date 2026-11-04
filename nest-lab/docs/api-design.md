# nest-lab API 设计约定(Week 3 总结)

这份约定**和语言、框架无关**:换成 ASP.NET Core、Spring、Go 来写同一个服务,也照这份来。
nest-lab 里每一条怎么落地,写在「对应代码」一列;机器可读的完整契约是仓库根目录的 [`openapi.json`](../openapi.json)(由代码生成,见文末)。

## 1. 资源与 URI

| 约定 | 例子 | 对应代码 |
|---|---|---|
| URI 用名词复数表示集合,`/{id}` 表示单个资源 | `/v2/tasks`、`/v2/tasks/3` | `tasks.controller.ts` |
| 动作用 HTTP 方法表达,不写进路径 | ✅ `DELETE /v2/tasks/3` ❌ `POST /deleteTask` | 同上 |
| 路径参数 `id` 是正整数,格式不对回 400 | `/v2/tasks/abc` → 400 `bad-request` | `ParseIntPipe` |
| 字段名统一 camelCase | `createdAt`、`nextCursor` | DTO / 响应类 |
| 时间一律 ISO 8601 UTC 字符串 | `2026-01-01T00:00:00.000Z` | 映射函数里 `toISOString()` |

## 2. 方法与状态码

| 方法 | 语义 | 安全 / 幂等 | 成功状态码 |
|---|---|---|---|
| `GET` | 读 | 安全、幂等 | 200 |
| `POST /集合` | 新建 | 都不是:发两次建两条 | **201** + `Location` 头指向新资源 |
| `PUT /资源` | 整体替换(没给的字段回到默认值) | 幂等 | 200 + 新的资源 |
| `PATCH /资源` | 部分更新(只改给了的字段) | 不保证幂等 | 200 + 新的资源 |
| `DELETE /资源` | 删除 | 幂等 | **204**,无响应体 |

- 资源存在但不支持这个方法 → **405**,响应头 `Allow` 列出支持的方法(`OPTIONS` 也回 `Allow`)。
- 请求合法、但和资源**当前状态**冲突 → **409**(例:已完成的任务改标题)。
- 不安全请求的「重复提交」问题(`Idempotency-Key`)、并发修改(`ETag` / `If-Match` / 412)→ Week 12 再做。

## 3. 内容协商

| 情况 | 状态码 | problem type |
|---|---|---|
| `Accept` 里没有 JSON(也没有 `*/*`) | 406 | `not-acceptable` |
| 有请求体但 `Content-Type` 不是 `application/json` | 415 | `unsupported-media-type` |
| 请求体不是合法 JSON | 400 | `bad-request` |

成功响应 `Content-Type: application/json`;错误响应 `Content-Type: application/problem+json`。

## 4. 校验:400 和 422 的分界线

- **400**:请求「读不懂」——JSON 语法错、路径参数格式不对、cursor 解析不了。
- **422**:请求「读得懂但内容不合规」——字段缺失、类型不对、长度超限、多了不认识的字段、`limit` 超过 100。
- 未知字段**拒绝**(不是悄悄丢掉),避免调用方以为自己改了其实没改。
- 422 必须带 `errors[]`,每项的 `pointer` 是 JSON Pointer(RFC 6901),**查询参数也用这个写法**(`#/limit`)。

## 5. 错误格式

所有 4xx / 5xx 都是 RFC 9457 `application/problem+json`:

```json
{ "type": "https://nest-lab.example/problems/not-found", "title": "资源不存在", "status": 404,
  "detail": "没有 id 为 999 的任务", "instance": "/v2/tasks/999", "requestId": "7c1e…" }
```

- 程序判断看 `type`,不要解析 `title` / `detail` 的文字。
- 每个 `type` 都登记在 [`problems.md`](problems.md);新增类别先登记再使用。
- 500 不返回任何内部细节(堆栈、SQL、文件路径),只给 `requestId`,详情看服务端日志。
- 每个响应都带 `x-request-id`(客户端传了就沿用,没传就生成)。

## 6. 响应表示

- 成功响应体**就是资源本身**,不包 `{ data, code, message }`。成功与否看状态码。
- 对外字段由**显式映射函数**决定(`toTaskResponse`、`toUserResponse`):内部模型加字段,响应不会自动多字段。
- 敏感字段(`passwordHash`、内部备注)永不出门;同一资源不同角色看到不同字段,在映射函数里用一个 `if` 表达。
- 响应字段**只增不减**;改名、删除、改类型都属于破坏性变更,走版本化(第 8 节)。

## 7. 集合:分页、过滤、排序

| 约定 | 细节 |
|---|---|
| 形状 | `{ "items": [...], "nextCursor": "…" \| null }`;`null` 表示最后一页 |
| 分页方式 | cursor(keyset),不用 offset;cursor 对调用方**不透明**,原样传回 `?cursor=` |
| `limit` | 默认 20,最大 100,超过回 422(不悄悄截断) |
| 总数 | 不返回 `total`(大表上 `COUNT(*)` 很贵;需要时单独设计) |
| cursor 无效 | 被篡改 / 和当前 `sort`、过滤条件不匹配 → 400 `invalid-cursor`,客户端丢掉 cursor 从第一页重来 |
| 过滤 | 显式的查询参数,如 `done=true`、`q=关键词`;不接受任意字段过滤 |
| 排序 | `sort=-createdAt,title`(`-` 表示倒序),字段**白名单**,最多 3 个,总会追加 `id` 保证顺序唯一 |

## 8. 版本化与弃用

- URI 版本:`/v2/...` 是当前版本;不带版本号的路径等同 v2(方便过渡,但新客户端请写明版本)。
- 只有**破坏性变更**才升主版本;加可选字段、加新接口、加新的错误类别都是兼容变更,不升版本。
- 旧版本标弃用时,响应头带 `Deprecation`、`Sunset`(下线日期)、`Link: <…>; rel="successor-version"`,OpenAPI 里标 `deprecated: true`。
- `/v1/...` 已弃用,计划 2027-05-01 下线。

## 9. 契约文档(OpenAPI)

- 采用 **code-first**:契约由代码上的装饰器生成,`openapi.json` 提交进 git,PR 里能直接看到接口变化。
- 改了接口 → `npm run openapi:generate` 一起提交;CI 跑 `npm run openapi:check`(过期就失败),e2e 测试里也有同样的比对。
- 每个写接口必须声明 422;每个可能的错误状态码都声明为 `application/problem+json`;弃用的操作标 `deprecated: true`。
- 交互文档 `/docs`、JSON `/docs-json`,由配置 `SWAGGER_ENABLED` 控制,**生产环境默认关闭**。
- 文档描述的是「应该怎样」,不保证实现真的这样:关键约定(422、problem+json、deprecated、字段一致)都有自动测试兜底。
