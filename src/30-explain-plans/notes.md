# Day 30 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> 今天的实验都在 `nest-lab/` 里(`sql/day30/`、`scripts/day30-try.mjs`),这个目录只放预测、诊断记录和默写。

## 1. 一个只写过前端的同事问你:"我在 Chrome DevTools 里看火焰图和 Network 瀑布图找性能瓶颈,数据库的执行计划也是这么看吗?"用取货路线单的比喻讲清楚怎么读一棵计划树、先看什么,并说出这个比喻在哪里会骗人(至少讲一个 cost / actual time / loops 的坑)。

(在这里写)



## 2. Nested Loop、Hash Join、Merge Join 各是怎么做的、各适合什么情况?为什么不该用 `enable_hashjoin = off` 去修生产上的慢查询?

(在这里写)



## 3. 统计信息是什么?过期了会怎样(用 imports 的例子)?`shared hit` 和 `read` 有什么区别,为什么本机上 read 也很快?

(在这里写)



---

## ✍️ 预测区(习题 1–3:先写预测,再运行,再批改)

- 「未完成任务最多的 3 个用户」:最里面是哪两个节点?Hash Join 估计产出几行?LIMIT 3 让排序变便宜了吗?
- 并行扫描 `rows=37037 loops=3`:一共多少行?
- tasks_cold 按 id 查:第一次 / 第二次的 hit、read?全表扫描两次呢?
- Index Scan vs Index Only Scan 各碰几页?Bitmap 在 work_mem 64kB 时会怎样?
- 排序 100 万行:work_mem 4MB 和 256MB 谁快?
- 三个 JOIN 场景各选哪种算法?关掉之后会换成什么、慢多少?
- imports 统计过期时估计几行、选什么计划?ANALYZE 之后呢?
- 城市 / 国家两列相关时估计几行?CREATE STATISTICS 之后呢?
- EXPLAIN ANALYZE DELETE 之后,事务里再数一次是多少?
- 习题 1 · 最耗时的节点和它自己花的时间;Docker 重启后 hit / read:
- 习题 2 · nest-lab 第一页 / `q=999` / `done=false` 的诊断结论(Day 34 要用):
- 习题 3 · 批量 UPDATE 后估算和实际各多少?ANALYZE 后变了吗?

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
