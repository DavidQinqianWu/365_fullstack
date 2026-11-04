# 一次 `GET /v2/tasks` 列表请求的一生(以及调用方从 openapi.json 开始的那一段)

> 场景:`npm run start:dev` 之后,一个前端调用方要做「未完成任务,最新的在前,每页 10 条」的无限滚动。
>
> ```bash
> # 第 0 步:调用方先拿契约
> curl -s localhost:3000/docs-json -o openapi.json
> npx openapi-typescript openapi.json -o api.d.ts
>
> # 第 1 页
> curl -i 'localhost:3000/v2/tasks?done=false&sort=-createdAt&limit=10' \
>   -H 'accept: application/json' \
>   -H 'x-request-id: review-3'
>
> # 第 2 页:把第 1 页响应里的 nextCursor 原样传回
> curl -i 'localhost:3000/v2/tasks?done=false&sort=-createdAt&limit=10&cursor=<第 1 页的 nextCursor>' \
>   -H 'x-request-id: review-3b'
> ```
>
> 要求:每一站标注两个编号 —— 它体现了 Week 3 的哪条约定(Day 15–20),以及它建在 Week 2 的哪个 Nest 机制上(Day 8–13)。
> 不许翻讲义、不许打开 nest-lab 的代码,先凭记忆写。

## 我画的流程

```
(在这里写。可以用文字编号,也可以用 mermaid flowchart / sequenceDiagram)
(主线:调用方拿到 openapi.json → 生成类型 → 发出第 1 页请求 → …… → 收到 { items, nextCursor } → 发出第 2 页请求)
```

## 逐站说明

| # | 站(组件 / 文件) | 发生了什么 | Week 3 的约定(Day 15–20) | 建在 Week 2 的哪个机制上(Day 8–13) | 如果这一站出问题 / 被拿掉会怎样 |
|---|---|---|---|---|---|
| 0 | | | | | |
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |
| 9 | | | | | |
| 10 | | | | | |
| 11 | | | | | |
| 12 | | | | | |
| 13 | | | | | |

## 支线 1:调用方把 cursor 改坏了一个字符(或者换了 `sort` 却还拿着旧 cursor),在哪一站失败?响应的状态码、`Content-Type`、`type` 是什么?`requestId` 从哪来?

(在这里写)

## 支线 2:`limit=500`、`sort=password`、`foo=1` 三个请求,分别在哪一站被拦下?状态码各是几?错误体里的 `errors[].pointer` 长什么样?

(在这里写)

## 支线 3:同一个调用方改用 `GET /v1/tasks`,经过的站有什么不同?响应体和响应头有什么不同?openapi.json 里它长什么样?

(在这里写)

## 支线 4:`Accept: text/html` 的请求、和不带版本号的 `GET /tasks`,分别在哪一站、得到什么结果?

(在这里写)

## 订正区(对照讲义后,把写错或漏掉的写在这里)

