# Week 6 自测(闭卷)

> 今天必做 12 题(约 20 min):基础题 1 分 × 6,理解题 2 分 × 4,综合题 5 分 × 2,满分 24。
> **低于 17 分,开始 Week 7 前先把错题对应的那天重看一遍。**
> 末尾另有 8 道选做题,留给下周的碎片时间。

## 基础题(1 分 × 6)

1. ACID 四个字母各保证什么?事务里一条语句出错之后,再发 `SELECT 1` 会得到什么?怎么只撤销出错的那一步而不是整个事务?(Day 36)

2. 写出五种并发异常的名字,各用一句话说明。PostgreSQL 默认是哪个隔离级别?在这个级别下,哪几种异常会静默发生?(Day 37)

3. 一次 `UPDATE` 在 PostgreSQL 的表里留下了什么?`xmin` 和 `xmax` 各记的是什么?`VACUUM` 和 `VACUUM FULL` 各做什么、各锁不锁表?(Day 38)

4. `SELECT … FOR UPDATE` 挡不挡普通的 `SELECT`?`NOWAIT`、`lock_timeout`、`SKIP LOCKED` 各在拿不到锁时怎么做?死锁报什么错误码?(Day 39)

5. 写出乐观锁的那条 `UPDATE`。影响 0 行可能是哪两种情况?悲观锁用的是哪条 SQL?(Day 40)

6. PgBouncer 的三种池模式各是什么?超时三件套各叫什么、到点各报什么?(Day 41)

## 理解题(2 分 × 4)

7. 两个事务同时给同一行「加 1」。分别写成 `UPDATE … SET n = n + 1` 和「先 SELECT 读出 n、应用里算 n + 1、再 UPDATE 写回」,在 Read Committed 和 Repeatable Read 下各会怎样?Day 40 的乐观锁为什么在 Read Committed 下就够了?(Day 37 / 40)

8. 一个连接 `BEGIN` 之后挂着不提交,会从哪三个方面伤害系统(提示:清理、锁、连接)?你会用哪条查询发现它,用哪个设置防住它?到点之后,nest-lab 的连接池会怎样?(Day 38 / 39 / 41)

9. 为什么一条等锁的 `ALTER TABLE` 会让一个和它毫不相干的 `SELECT` 也卡住?线上执行 DDL 前应该先设什么、失败了怎么办?(Day 39)

10. 在 PgBouncer 的 transaction 模式下:一个客户端执行了不带 `LOCAL` 的 `SET statement_timeout`、另一个客户端执行了会话级 `pg_advisory_lock`、第三个客户端用了具名预备语句,各会出什么问题、各怎么修?nest-lab 的 `search_path` 又遇到了什么问题?(Day 41)

## 综合题(5 分 × 2)

11. **场景题:**促销活动时,商品库存出现了负数,而代码里明明是「先查库存,够了才扣」。**请定位原因(画出两个请求的时间线,说明是哪一种并发异常),给出三种修法(至少包括一种乐观、一种悲观、一种不需要先读的写法),并比较它们在高并发抢购下的正确性、吞吐、实现复杂度和失败时用户看到什么。**如果规则变成「同一个用户在活动期间最多买 2 件」(要数他已有的订单),哪些修法还管用,为什么?

12. **场景题:**凌晨一次 `ALTER TABLE` 让整个 API 卡死了 3 分钟;同一周,数据库磁盘告警说某张表膨胀到了正常大小的 10 倍。**这两件事可能有什么共同的根因?请给出排查步骤(先查什么、用哪些视图或命令、期望看到什么证据),以及预防措施(数据库设置、应用代码、发布流程、监控各至少一条)。**如果系统前面有 PgBouncer,排查时有什么要额外注意的地方?

---

## 我的答案

(写在这里)

---

## 得分:___ / 24

## 需要重看的天:

---

## 选做题(下周碎片时间,不计分)

13. 「至少留一个人值班」的写偏斜:两个人同时请假,Read Committed、Repeatable Read、Serializable 下各是什么结果?除了 Serializable + 重试,还有哪两种修法?(Day 37)

14. Serializable 报 40001 之后,为什么必须重做整个事务,而不能只重试失败的那条语句?`withRetry` 的退避为什么要加随机抖动?它的 `isRetryable` 在 nest-lab 里被换成了什么?(Day 37 / 40)

15. 两个事务以相反顺序改两行,多久后谁报错?错误详情里写了什么?「按 id 排序一次性 `FOR UPDATE`」为什么能避免?(Day 39)

16. 用 `SKIP LOCKED` 做的任务队列:worker 领到任务后进程崩溃,任务会怎样?worker 没崩溃但卡住 10 分钟呢?你会怎样设计「超时未完成的任务重新放回队列」?(Day 39)

17. HOT 更新、`fillfactor` 和 MVCC 是什么关系?为什么 Day 31 的覆盖索引会让 PATCH 变慢,又会让 Index Only Scan 出现大量 Heap Fetches?(Day 31 / 32 / 38)

18. PUT 带着同一个 `version` 重放两次会怎样?不带 `version` 时 PUT 还幂等吗?Week 12 改成 `ETag` / `If-Match` 时,`412` 和 `409` 怎么分工?(Day 15 / 40)

19. 给一个 8 核、`max_connections = 200` 的数据库,前面挂 10 个 nest-lab 副本和一个迁移工具。不用 PgBouncer 和用 PgBouncer 时,`DB_POOL_MAX`、`default_pool_size`、`max_client_conn` 各怎么定?写出算式。(Day 41)

20. MySQL(InnoDB)的默认隔离级别、MVCC 的实现、Repeatable Read 下防幻读的办法,和 PostgreSQL 各有什么不同?SQL Server 的 `READ_COMMITTED_SNAPSHOT` 又是什么?(Day 37 / 38,未实测)
