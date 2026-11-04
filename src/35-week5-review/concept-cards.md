# Week 5 概念卡默写

> 规则:闭卷,约 25 min(每张卡约 4 分钟:先写三段,下面的小问题能写多少写多少)。
> 每张卡必须有三部分 —— **通用定义**(不绑定数据库)/ **PostgreSQL 里的样子** / **MySQL(InnoDB)、SQL Server 里的样子**。
> 写完再对照 Day 29–34 讲义订正,订正的地方用 **粗体** 标出。MySQL / SQL Server 的内容大多没在本机实测,订正时也标上「未实测」。

---

## 卡片 1:B-tree 与选择性(Day 29)

**通用定义:**

**PostgreSQL 里:**

**MySQL / SQL Server 里:**

- B-tree 为什么能做等值、范围、排序?树有几层、为什么这么「矮」:
- 一个索引条目里存了什么;「回表」是什么:
- 选择性是什么;为什么查 90% 的行时优化器宁可全表扫描:
- 索引页满了会怎样(页分裂):

---

## 卡片 2:执行计划、BUFFERS、JOIN 算法与统计信息(Day 30)

**通用定义:**

**PostgreSQL 里:**

**MySQL / SQL Server 里:**

- 计划树从哪里开始读;cost 和 actual time 的区别;`loops` 怎么算:
- `shared hit` / `read` 各是什么;为什么本机 read 也很快:
- Nested Loop / Hash Join / Merge Join 各适合什么;为什么不该用 `enable_*` 修生产:
- 统计信息是什么、谁收集的;过期或估错时会怎样:

---

## 卡片 3:复合索引、覆盖索引与 visibility map(Day 31)

**通用定义:**

**PostgreSQL 里:**

**MySQL / SQL Server 里:**

- 最左前缀:`(a, b)` 能服务哪些条件,不能服务哪些:
- 列顺序怎么定(等值在前、范围 / 排序在后);「选择性高的放前面」错在哪:
- 一个索引同时服务 WHERE + ORDER BY + LIMIT;方向混合时怎么办(Day 34 补充:按时间追加的列要小心什么):
- `INCLUDE` 列和键列的区别;Index Only Scan 为什么还会 Heap Fetches;VACUUM 做了什么:

---

## 卡片 4:部分、表达式、外键索引与索引的代价(Day 32)

**通用定义:**

**PostgreSQL 里:**

**MySQL / SQL Server 里:**

- 部分索引什么时候能被用上;为什么通用计划里的 `done = $1` 用不上:
- 表达式索引为什么要求 IMMUTABLE;`created_at::date` 的正确写法:
- 外键列为什么要索引;没有时删父行在计划里是什么样子:
- 写放大与 WAL;HOT 更新的两个条件;`idx_scan = 0` 删之前要确认什么:

---

## 卡片 5:GIN、pg_trgm、全文搜索与 BRIN(Day 33)

**通用定义:**

**PostgreSQL 里:**

**MySQL / SQL Server 里:**

- 倒排索引是什么;GIN 为什么不能排序:
- 三元组怎么切;中文为什么 2 个字帮不上;括号为什么又行了:
- trigram 和全文搜索各找什么;PostgreSQL 默认为什么不支持中文分词:
- BRIN 存了什么;它为什么小;数据顺序乱了会怎样:

---

## 卡片 6:pg_stat_statements 与「先测量后优化」(Day 34)

**通用定义:**

**PostgreSQL 里:**

**MySQL / SQL Server 里:**

- 开启要哪几步;为什么要重启;为什么普通用户建不了这个扩展:
- 为什么按总耗时排序;规范化是什么、它会藏住什么:
- 优化循环的四步;今天的「一次回退」是怎么发生、怎么修的:
- 「一个查询一个索引」vs「少数索引服务多数查询」:nest-lab 最后建了哪几个、为什么:

---

## 一句话总结(写完六张卡后)

- **「索引是取舍,不是越多越好」对我来说意味着:**
- **这一周最让我意外的一次实测结果是:**
- **nest-lab 现在的每个索引各服务哪条查询(不看 schema.sql 写出来):**
