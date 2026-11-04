# 两个同时到达的 `PATCH /v2/tasks/1` 经过 PgBouncer 进入 PostgreSQL 的一生

> 场景:nest-lab 以 `TASKS_STORAGE=postgres` 运行,`DATABASE_URL` 指向 PgBouncer(6432,transaction 模式,`DB_STARTUP_SEARCH_PATH=false`)。
> 任务 1 当前是 `version = 3`、`done = false`。两个客户端几乎同时发出:
>
> ```bash
> curl -s -X PATCH localhost:3000/v2/tasks/1 -H 'x-demo-key: let-me-in' -H 'content-type: application/json' -d '{"title":"改个标题","version":3}'   # 请求 A
> curl -s -X PATCH localhost:3000/v2/tasks/1 -H 'x-demo-key: let-me-in' -H 'content-type: application/json' -d '{"done":true,"version":3}'          # 请求 B
> ```
>
> 要求:Nest 管线(guard、DTO 校验、Controller → Service)可以简写成一两行;**重点画「连接 → 事务 → 快照 / 行版本 → 行锁 → 写入 → 清理」**。
> 每一站标注两个编号:它是 Week 6 哪一天学的(Day 36–41),以及它建在 Week 1–5 的哪个机制上。
> 不许翻讲义、不许打开 nest-lab 的代码和 `docs/db-timeouts.md`,先凭记忆写。

## 我画的流程(两条泳道:请求 A、请求 B;中间标出它们在哪里相遇)

```
(在这里写。可以用文字编号,也可以用 mermaid sequenceDiagram:
 客户端 A / 客户端 B → nest-lab(pg.Pool)→ PgBouncer → PostgreSQL 后端进程 → 表 tasks 的行版本)
```

## 逐站说明

| # | 站(组件 / SQL / 内部机制) | 请求 A 在这里发生了什么 | 请求 B 在这里发生了什么 | Week 6 的 Day(36–41) | 建在 Week 1–5 的哪个机制上 | 这一站出问题时你会在哪里看到证据 |
|---|---|---|---|---|---|---|
| 0 | | | | | | |
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |
| 9 | | | | | | |
| 10 | | | | | | |

## 凭记忆写出这次修改真正发给 PostgreSQL 的 SQL(按顺序;哪几条在同一个事务里?读那一条在不在事务里?)

```sql
-- 在这里写
```

## 「读 → 判断 → 写」这三步,分别借了几次连接?经过 PgBouncer 时,它们会不会落在不同的服务端连接上?为什么这不影响正确性?

(在这里写)

## 两个 UPDATE 在 PostgreSQL 里相遇的那一刻:谁等谁?等的是什么锁?后到的那个醒来以后,WHERE 是用哪个版本的行重新判断的?为什么 Read Committed 就够了?

(在这里写)

## 败下来的那个请求:仓储返回什么、Service 做了什么、客户端最后收到的状态码和 `type` 是什么?

(在这里写)

## 写完之后:旧的那一行版本去了哪里?它什么时候、被谁清掉?在它被清掉之前,谁还可能看得见它?

(在这里写)

## 支线 1:改用悲观锁 `updateLocked`(`SELECT … FOR NO KEY UPDATE`)。第二个请求在哪里等(nest-lab?PgBouncer?PostgreSQL?)、等多久、等的时候占着什么?醒来以后读到的是哪一版?

(在这里写)

## 支线 2:请求 A 的代码在 `BEGIN` 之后去调了一个外部接口,卡住 2 分钟不提交(idle in transaction)。请求 B、PgBouncer 的池子、autovacuum 各会怎样?哪一个超时会先出手?应用这边会看到什么错误,连接池怎么恢复?

(在这里写)

## 支线 3:客户端都没带 `version`。服务器内部发生了什么(重试几次、每次重做哪些步骤)?如果 B 先提交,A 最后得到什么?为什么不能只重试「最后那条 UPDATE」?

(在这里写)

## 支线 4:同样的两个请求在 `TASKS_STORAGE=memory` 时,从哪一站开始走了不同的路?内存版靠什么保证「检查版本 + 写」不被插队?它挡得住哪一种竞态、挡不住哪一种?

(在这里写)

## 订正区(对照讲义后,把写错或漏掉的写在这里)

