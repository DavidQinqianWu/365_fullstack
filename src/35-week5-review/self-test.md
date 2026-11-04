# Week 5 自测(闭卷)

> 今天必做 12 题(约 20 min):基础题 1 分 × 6,理解题 2 分 × 4,综合题 5 分 × 2,满分 24。
> **低于 17 分,开始 Week 6 前先把错题对应的那天重看一遍。**
> 末尾另有 8 道选做题,留给下周的碎片时间。

## 基础题(1 分 × 6)

1. B-tree 为什么能同时做等值查询、范围查询和排序?「选择性」是什么?为什么 `WHERE done = true`(90% 的行)时,优化器宁可全表扫描?(Day 29)

2. 读一棵执行计划树,从哪里开始读?`cost` 和 `actual time` 有什么区别?`shared hit=…` 和 `read=…` 各表示什么?(Day 30)

3. `(owner_id, created_at)` 能服务 `WHERE owner_id = ?`、`WHERE created_at > ?`、`WHERE owner_id = ? ORDER BY created_at DESC LIMIT 20` 中的哪几个?`INCLUDE` 进来的列和键列有什么区别?(Day 31)

4. 部分索引 `WHERE done = false` 在什么条件下能被查询用上?为什么 `CREATE INDEX … ((created_at::date))` 会报错?PostgreSQL 会自动给外键列建索引吗?(Day 32)

5. GIN 是什么样的索引?`LIKE '%加急%'` 为什么用不上 trigram GIN?BRIN 里存的是什么?(Day 33)

6. 开启 `pg_stat_statements` 要哪几步?找优化对象时按哪一列排序?它为什么会把 `q=urgent` 和 `q=加急` 记成同一行?(Day 34)

## 理解题(2 分 × 4)

7. nest-lab 的 `?sort=-createdAt` 实际排序是什么?Day 31 时 `keysetCondition()` 为它生成的条件为什么在深分页时慢?Day 34 加的那个条件为什么不改变结果?offset 翻页为什么越往后越慢?

8. 同一张表上,`UPDATE tasks SET done = …` 和 `UPDATE tasks SET title = …` 哪个有可能是 HOT 更新?在 nest-lab 现在的索引下呢?fillfactor 和 HOT 有什么关系?为什么 Day 31 的覆盖索引 `INCLUDE (title, done)` 会让 PATCH 变慢?

9. 「统计信息估错,计划就选错」:分别说 Day 30 的 imports 实验和 Day 34 的 `q=invoice` 回退里,估算和实际各是多少、选错了什么计划、怎么修的。`SET STATISTICS 1000` 有什么副作用?

10. trigram 和全文搜索各自擅长什么?搜 `voice` 和搜 `exports` 时两者的结果为什么正好相反?nest-lab 的 `?q=` 为什么选 trigram?

## 综合题(5 分 × 2)

11. **场景题:**产品说任务列表「越往后翻越慢」,同时运营说「搜索『加急』两个字很慢」。**请分别给出定位步骤(先看什么、再看什么)、你期望看到的证据(pg_stat_statements 里的哪一行、EXPLAIN 里的哪个节点和哪个数字),以及修法。**说明两个问题里哪个可以彻底修好、哪个只能缓解,为什么。如果用户反映的是「翻页时偶尔看到重复的任务」,原因又会是什么?

12. **场景题:**DBA 发现 tasks 表的索引加起来比表本身大 3 倍,写入的 p95 也变差了,要求你删掉一些索引。**请说明你怎么决定删哪些:要看哪些统计、怎么判断一个索引「没用」或「重复」、删之前必须确认哪几件事(至少四件),以及删的时候怎么做才不影响线上。**如果某个索引 `idx_scan` 很高但你仍然想删,你要拿出什么证据?

---

## 我的答案

(写在这里)

---

## 得分:___ / 24

## 需要重看的天:

---

## 选做题(下周碎片时间,不计分)

13. 为什么 Day 34 最后建的是 `(created_at, id)` 而不是 Day 31 建议的 `(created_at DESC, id)`?两个索引在什么情况下一样大,在什么情况下差 70%?`-createdAt` 用升序索引时,计划里多了什么节点、代价大不大?

14. Nested Loop、Hash Join、Merge Join 各在什么情况下最合适?「按邮箱找会员、再数他的任务」在外键列有 / 没有索引时,各会选哪一种?

15. Index Only Scan 的计划里写着 `Heap Fetches: 37666`,这是怎么回事?怎么让它变回 0?为什么频繁更新的表上覆盖索引的好处会缩水?

16. `PREPARE … WHERE done = $1`:默认 `plan_cache_mode` 下,前几次和之后用的是什么计划?什么时候会用不上部分索引?nest-lab 用 `pg` 驱动发不具名查询时又是什么情况?

17. 什么样的表适合 BRIN?把数据打乱以后,为什么强行用 BRIN 比全表扫描还慢?计划里哪两个数字能说明问题?

18. `jsonb_ops` 和 `jsonb_path_ops` 怎么选?`WHERE meta->>'source' = 'api'` 为什么两种 GIN 都用不上,有哪两种改法?

19. 本机数据库的排序规则是 `C.UTF-8`,为什么普通 B-tree 用不上 `LIKE 'Fix invoice%'`?nest-lab 的哪个索引顺带能服务前缀查询?换成 Docker 的 `en_US.utf8` 呢?

20. 把 nest-lab 的数据库换成 MySQL 8 或 SQL Server,Week 5 写进 `schema.sql` 的哪些东西需要改写?(至少举出四处:例如 trigram GIN、部分索引、`INCLUDE`、表达式索引、降序索引、`SET STATISTICS`、`pg_stat_statements`……)
