# Day 32 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> 今天的实验都在 `nest-lab/` 里(`sql/day32/`、`scripts/day32-try.mjs`),这个目录只放预测、设计结论和默写。

## 1. 一个只写过前端的同事说:"我给列表页的每种筛选状态都建了一个 memo / 缓存,读得飞快;可是数据一改,就要让一堆缓存失效,写得越来越慢。"用这个经历给他讲清楚「数据库的索引为什么不是越多越好」、什么是 HOT 更新,并说出这个类比在哪里会骗人。

(在这里写)



## 2. 部分索引和表达式索引各是什么?各举一个用途。为什么 `done = $1` 有时用不上部分索引、`created_at::date` 不能建索引?

(在这里写)



## 3. 为什么外键列要建索引?不建时,删除一个父行在 `EXPLAIN ANALYZE` 里是什么样子?怎么找出库里所有没有索引的外键?

(在这里写)



---

## ✍️ 预测区(习题 1–3:先写预测,再运行,再批改)

- 部分索引 `(created_at) WHERE done = false` 和完整索引 `(done, created_at)` 各多大?
- `done = false` / `NOT done` / `done IS NOT TRUE` / `done = true` 各能不能用上部分索引?
- `PREPARE … WHERE done = $1`:默认、强制通用计划时各用什么计划?nest-lab 的 pg 驱动呢?
- 两条 INSERT 被部分唯一索引拒绝的是哪条?
- `lower(email) =` / `email =` / `email ILIKE` 谁能用上表达式索引?
- `CREATE INDEX … ((created_at::date))` 能建成吗?
- 外键列没有索引时,删除一个没有任务的会员要多久?时间显示在计划的哪一行?
- 0 / 1 / 3 / 6 个索引:INSERT 20 万行的耗时和 WAL?
- 五张表 a–e 哪几张能 HOT?
- 哪个索引被用了 0 次?`tasks_owner_idx` 会被外键检查用到吗?
- 习题 1 · `done = false AND owner_id = 2`、`NOT done OR owner_id = 2` 能不能用部分索引?`lower(email) LIKE 'user42%'` 呢?
- 习题 2 · nest-lab 的 `?done=false` 索引怎么建;Week 10 的 users 表要哪两个索引(Day 34 / Week 10 要用):
- 习题 3 · 3 → 6 个索引每天多写多少 WAL?覆盖索引 `INCLUDE (title, done)` 值不值?

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
