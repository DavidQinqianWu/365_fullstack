# 一次 `GET /v2/tasks?q=invoice&sort=-createdAt&limit=20&cursor=…` 在 PostgreSQL 里的一生

> 场景:`npm run db:seed:big` 之后(schema app,30 万任务,Day 34 的三个索引都在),`.env` 里 `TASKS_STORAGE=postgres`,`npm run start:dev`,然后翻到第二页:
>
> ```bash
> curl -s 'localhost:3000/v2/tasks?q=invoice&sort=-createdAt&limit=20'               # 第一页,拿到 nextCursor
> curl -s 'localhost:3000/v2/tasks?q=invoice&sort=-createdAt&limit=20&cursor=<上一页的 nextCursor>'
> ```
>
> 要求:Nest 管线(DTO 校验、cursor 解码、Service → PgTasksRepository 拼 SQL)可以简写成两三行;
> **重点画 SQL 到达 PostgreSQL 之后的部分**。每一站标注两个编号:它是 Week 5 哪一天学的(Day 29–34),以及它建在 Week 1–4 的哪个机制上。
> 不许翻讲义、不许打开 nest-lab 的代码和 `docs/query-tuning.md`,先凭记忆写。

## 我画的流程

```
(在这里写。可以用文字编号,也可以用 mermaid flowchart:SQL 到达 → 解析 → 优化器读统计信息、估算行数 → 列出候选计划并按 cost 选一个 → 执行节点一层层往上交行 → 结果返回 → pg_stat_statements 记一笔)
```

## 逐站说明

| # | 站(组件 / 计划节点 / 统计) | 发生了什么 | Week 5 的 Day(29–34) | 建在 Week 1–4 的哪个机制上 | 这一站出问题时你会在哪里看到证据 |
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

## 这条 SQL 长什么样(凭记忆写出 WHERE / ORDER BY / LIMIT 部分,尤其是 cursor 变成的条件)

```sql
-- 在这里写
```

## 优化器在这几个候选计划之间怎么选?(各写出:它会怎么执行、要读多少行 / 页、什么情况下它会赢)

| 候选计划 | 怎么执行 | 什么情况下它赢 | 依赖哪个索引 / 哪项统计 |
|---|---|---|---|
| 倒着扫 `(created_at, id)`、边扫边过滤 | | | |
| GIN 位图找出全部匹配行、再排序 | | | |
| 全表扫描 + 排序 | | | |

## 执行时的 BUFFERS:`shared hit` 和 `read` 各代表什么?本机为什么几乎全是 hit?生产上会怎样?

(在这里写)

## 结束之后:pg_stat_statements 记下了什么?这一行和 `q=12345`、`q=加急` 的请求是同一行吗?为什么?

(在这里写)

## 支线 1:统计信息估错了。如果 ANALYZE 抽样把 `invoice` 的命中估成 30 行,计划会变成什么?你会在哪里发现(至少两个地方)?怎么修?修完带来什么副作用?(回扣 Day 30 的 imports、Day 34 的真实回退)

(在这里写)

## 支线 2:`q` 只有 2 个字(`q=加急`)。三元组能抽出几个?计划会是什么?最坏的情况是什么样的关键词?nest-lab 为什么没有禁止它?

(在这里写)

## 支线 3:翻到第 1 万页。keyset(现在的实现)和 offset 分别要读多少行?Day 31 发现的那个 bug 如果没修,第 1 万页的计划长什么样、`Rows Removed by Filter` 大约是多少?

(在这里写)

## 支线 4:同一个请求在 `TASKS_STORAGE=memory` 时,从哪一站开始走了不同的路?内存版的「深分页」有没有同样的问题?

(在这里写)

## 订正区(对照讲义后,把写错或漏掉的写在这里)

