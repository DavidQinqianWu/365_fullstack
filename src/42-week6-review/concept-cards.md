# Week 6 概念卡默写

> 规则:闭卷,约 25 min(每张卡约 4 分钟:先写三段,下面的小问题能写多少写多少)。
> 每张卡必须有三部分 —— **通用定义**(不绑定数据库和语言)/ **PostgreSQL / NestJS(nest-lab)里的样子** / **MySQL、SQL Server、.NET、Java 里的样子**。
> 写完再对照 Day 36–41 讲义订正,订正的地方用 **粗体** 标出。第三部分大多没在本机实测,订正时标上「未实测」。

---

## 卡片 1:事务与 ACID、aborted 状态(Day 36)

**通用定义:**

**PostgreSQL / nest-lab 里:**

**MySQL / SQL Server / .NET / Java 里:**

- A、C、I、D 各保证什么、各靠什么机制实现(各举一个本周的实测):
- 事务里有一条语句出错之后,再发语句会怎样?SAVEPOINT 能做什么?
- 什么东西「回滚不了」(至少两样)?
- nest-lab 的 `transaction()` 修了哪两个缺陷?为什么 ROLLBACK 失败时要 `release(err)`?

---

## 卡片 2:隔离级别与五种并发异常(Day 37)

**通用定义:**

**PostgreSQL / nest-lab 里:**

**MySQL / SQL Server / .NET / Java 里:**

- 脏读、不可重复读、幻读、丢失更新、写偏斜各是什么(各用一句话 + 一个例子):
- PostgreSQL 的四个级别实际各挡住了哪几种?为什么 Read Uncommitted = Read Committed?
- Read Committed 下 `SET n = n + 1` 为什么不丢,「读 → 算 → 写回」为什么会丢?
- 40001 是什么、在哪两个级别出现、应用该怎么做?

---

## 卡片 3:MVCC 与 VACUUM(Day 38)

**通用定义:**

**PostgreSQL / nest-lab 里:**

**MySQL / SQL Server / .NET / Java 里:**

- UPDATE 在磁盘上做了什么?`xmin`、`xmax`、`ctid` 各是什么?
- 快照怎么判断一个行版本「看得见」?
- 死元组、表膨胀;`VACUUM` 和 `VACUUM FULL` 的区别;autovacuum 什么时候来?
- 长事务 / idle in transaction 为什么会挡住清理?冻结和事务 ID 回卷是什么(一句话)?

---

## 卡片 4:锁 —— 行锁、SKIP LOCKED、表锁与 DDL 锁队列、死锁、咨询锁(Day 39)

**通用定义:**

**PostgreSQL / nest-lab 里:**

**MySQL / SQL Server / .NET / Java 里:**

- 有了 MVCC 为什么还要锁?行锁挡不挡普通读?四种行锁里,UPDATE 自己拿的是哪种?外键检查拿哪种?
- `NOWAIT`、`lock_timeout`、`SKIP LOCKED` 各怎么用;SKIP LOCKED 队列为什么不重复、不互等?
- 一条 `ALTER TABLE` 为什么能让无关的 SELECT 超时?
- 死锁怎么被发现、多久被发现、怎么避免?事务级和会话级咨询锁的区别?

---

## 卡片 5:乐观锁 vs 悲观锁(Day 40)

**通用定义:**

**PostgreSQL / nest-lab 里:**

**MySQL / SQL Server / .NET / Java 里:**

- 「先查后改」的两种翻车各是什么?Node 单线程为什么挡不住?
- 乐观锁的 SQL 怎么写?0 行有哪两种意思?客户端带不带 `version` 时 nest-lab 各怎么处理?
- 悲观锁的 SQL 怎么写?为什么是 `FOR NO KEY UPDATE`?锁能不能跨请求?
- 怎么选(跨请求 / 冲突多 / 重做代价大 / 多行规则)?

---

## 卡片 6:连接池、PgBouncer 与超时三件套(Day 41)

**通用定义:**

**PostgreSQL / nest-lab 里:**

**MySQL / SQL Server / .NET / Java 里:**

- 为什么 PostgreSQL 的连接贵?连接数和吞吐是什么关系(本机实测大概多少)?
- 多副本时怎么算账?PgBouncer 三种模式各怎样?
- transaction 模式下哪些「会话级」东西会出问题、各怎么修?nest-lab 为什么加了 `DB_STARTUP_SEARCH_PATH`?
- 超时三件套各防什么、到点各报什么?推荐设在哪里、为什么?

---

## 收尾(写完六张卡再写)

**用一句话说:Week 6 的题眼「很多人同时改的时候,怎么还对」,对 nest-lab 意味着什么?**

**这一周最让你意外的一次实测结果:**

**不看代码,写出 nest-lab 现在哪些地方用了事务、哪里有版本号检查、哪里会重试、重试什么错误:**

