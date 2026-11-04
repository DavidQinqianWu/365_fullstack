# 一个带 checklist 的 `POST /v2/tasks` 从 HTTP 到写进 PostgreSQL 的一生

> 场景:`.env` 里 `TASKS_STORAGE=postgres`,`npm run db:reset` 之后 `npm run start:dev`,然后:
>
> ```bash
> curl -i -X POST localhost:3000/v2/tasks \
>   -H 'content-type: application/json' \
>   -H 'x-demo-key: let-me-in' \
>   -H 'x-request-id: review-4' \
>   -d '{"title":"复盘 Week 4","checklist":[{"text":"画全景图","done":false},{"text":"默写六张卡","done":false}]}'
> ```
>
> 要求:Week 2–3 的管线各站(中间件、guard、pipe、Controller、Service、filter……)可以简写成一行;
> 重点画 Service 之后的部分。每一站标注两个编号 —— 它是 Week 4 哪一天学的(Day 22–27),以及它建在 Week 1–3 的哪个机制上。
> 不许翻讲义、不许打开 nest-lab 的代码,先凭记忆写。

## 我画的流程

```
(在这里写。可以用文字编号,也可以用 mermaid sequenceDiagram:客户端 → Nest 管线 → TasksService → PgTasksRepository → 连接池 → PostgreSQL 后端进程 → 磁盘)
```

## 逐站说明

| # | 站(组件 / 文件 / SQL) | 发生了什么 | Week 4 的 Day(22–27) | 建在 Week 1–3 的哪个机制上 | 如果这一站出问题 / 被拿掉会怎样 |
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

## 这个请求里,哪几条约束分别在哪一步被检查?

| 约束 | 在哪条 SQL 执行时检查 | 违反时的 SQLSTATE | 最后变成什么 HTTP 响应 |
|---|---|---|---|
| | | | |
| | | | |
| | | | |
| | | | |

## 支线 1:checklist 的第二项违反了约束(比如全是空格,且绕过了 DTO)。数据库里会留下什么?回滚回到哪一步?连接最后去了哪里?调用方收到什么?

(在这里写)

## 支线 2:两个请求同时要创建同一个名字的标签(Day 26 的 UPSERT)。分别用「先查后插」「唯一约束 + 报错」「ON CONFLICT DO NOTHING」三种写法,两个请求各得到什么?

(在这里写)

## 支线 3:数据库挂掉了。① 应用启动时数据库就连不上;② 应用运行中数据库突然重启。两种情况下,应用分别会怎样?调用方收到什么?(第 ② 种你不确定的,写下你的猜测和怎么验证)

(在这里写)

## 支线 4:同一个请求在 `TASKS_STORAGE=memory` 时,从哪一站开始走了不同的路?哪些站完全一样?

(在这里写)

## 订正区(对照讲义后,把写错或漏掉的写在这里)

