# Week 4 概念卡默写

> 规则:闭卷,约 25 min(每张卡约 4 分钟:先写三段,下面的小问题能写多少写多少)。
> 每张卡必须有三部分 —— **通用定义**(不绑定语言)/ **PG 或 Nest 里的样子** / **.NET、Java、Go 里(或 SQL Server、MySQL 里)的样子**。
> 写完再对照 Day 22–27 讲义订正,订正的地方用 **粗体** 标出。

---

## 卡片 1:客户端-服务器与每连接一个进程(Day 22)

**通用定义:**

**PG / Nest 里:**

**.NET / Java / Go 或 SQL Server / MySQL 里:**

- 为什么后端不把数据放在服务的内存里(至少三个理由):
- psql、nest-lab、GUI 工具和 PostgreSQL 服务器是什么关系:
- 「每连接一个进程」:谁 fork 谁、在哪里能看到、连接断开后会怎样:
- 集群 / 数据库 / schema / 表 / 行 / 列的层级;`\c` 换库时发生了什么:
- 忘写 WHERE 的后果,以及两种保命办法:

---

## 卡片 2:范式与反范式(Day 23)

**通用定义:**

**PG / Nest 里:**

**.NET / Java / Go 或 SQL Server / MySQL 里:**

- 宽表的三类异常:
- 函数依赖;1NF / 2NF / 3NF 各消除了什么:
- 1:1 / 1:N / N:M 怎么落到表上:
- 什么时候故意反范式,代价是什么、谁来维护:
- 为什么说 schema 设计是最难改的决定:

---

## 卡片 3:主键与约束(Day 24)

**通用定义:**

**PG / Nest 里:**

**.NET / Java / Go 或 SQL Server / MySQL 里:**

- 自然键 vs 代理键;serial / ALWAYS / BY DEFAULT 的区别;为什么默认 bigint:
- UUID v4 vs v7;PG 16 下怎么生成 v7:
- 五种约束;ON DELETE 的几个选项各表示什么业务含义:
- DTO 校验和数据库约束各防什么;「先查后插」为什么拦不住并发注册:
- 四个 SQLSTATE 和它们在 nest-lab 里映射成的状态码:

---

## 卡片 4:JOIN、聚合、扇出与 NULL(Day 25)

**通用定义:**

**PG / Nest 里:**

**.NET / Java / Go 或 SQL Server / MySQL 里:**

- INNER / LEFT / CROSS / 自连接 / EXISTS / NOT EXISTS 各用在什么时候:
- LEFT JOIN 的条件放 ON 和放 WHERE 的区别:
- 扇出是什么,怎么识别、怎么修:
- WHERE vs HAVING;COUNT(*) vs COUNT(列);逻辑执行顺序:
- NULL 的三值逻辑;`NOT IN` 遇 NULL 的坑:

---

## 卡片 5:窗口函数、UPSERT、RETURNING、JSONB、timestamptz(Day 26)

**通用定义:**

**PG / Nest 里:**

**.NET / Java / Go 或 SQL Server / MySQL 里:**

- 窗口函数和 GROUP BY 的区别;每组最新的三种写法:
- UPSERT 靠什么判断「已存在」;DO NOTHING 的 RETURNING 坑:
- RETURNING 在 POST / PATCH / DELETE 里各有什么用:
- JSONB 何时用、何时别用;checklist 为什么用子表:
- timestamptz 存的是什么;夏令时下 1 day 和 24 hours 的区别:

---

## 卡片 6:连接池、参数化查询与换仓储(Day 27)

**通用定义:**

**PG / Nest 里:**

**.NET / Java / Go 或 SQL Server / MySQL 里:**

- 连接池解决什么问题;池子大小怎么定;多副本时怎么算账:
- SQL 注入的原理;参数化为什么能防;哪些部分不能参数化:
- 事务为什么必须用同一个连接:
- 「换仓储只改一行」实际改了什么;抽象泄漏是什么:
- 同一套 e2e 在两种仓储上通过,说明了什么、没说明什么:

---

## 一句话总结(写完六张卡后)

- **「数据库是后端的心脏」对我来说意味着:**
- **这一周最让我意外的一次实测结果是:**
- **nest-lab 的数据现在靠哪几层保证不会坏:**
