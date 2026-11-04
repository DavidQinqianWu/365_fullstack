# Day 34 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> 今天的改动都在 `nest-lab/` 里(`sql/schema.sql`、`src/tasks/pg-tasks.repository.ts`、`sql/day34/`、`scripts/day34-try.mjs`、`docs/query-tuning.md`),这个目录只放预测、方案和默写。

## 1. 一个只写过前端的同事说:"我们做前端性能优化时先跑 Lighthouse、看 Web Vitals,优化最影响用户的那个指标。后端怎么知道该先优化哪条 SQL?"用账房「每日工作量统计表」的比喻讲清楚 pg_stat_statements 和「按总耗时排序」,并说出这个比喻在哪里会骗人。

(在这里写)



## 2. 今天的优化循环里出现了一次回退:加了 GIN 之后常见词反而变慢。原因是什么?怎么发现的?怎么修的?修完又带来了什么新的代价?

(在这里写)



## 3. 为什么最后只建了三个索引,而不是 Day 31 清单里的全部?举两个「不建」的例子和理由。为什么 `created_at` 的索引是升序的?

(在这里写)



---

## ✍️ 预测区(习题 1–3:先写预测,再运行,再批改)

- 优化前加负载:pg_stat_statements 总耗时第一的是哪个请求?`GET /tasks/:id` 会上榜吗?
- 三个索引加上以后,`-createdAt` 第一页、`title` 第一页各快多少?
- 深分页:修复前 / 后,`Rows Removed by Filter` 各是多少?
- `?q=12345`、`?q=不存在的任务`、`?q=urgent`、`?q=加急`:有没有 GIN 各多久?哪几个几乎不变?
- 同一份数据连续 ANALYZE 5 次,`ILIKE '%invoice%'` 的估算一样吗?
- 没有 done 的索引,`?done=false&sort=-createdAt` 第一页要多久?
- 逐行插入 30 万个递增时间,`(created_at DESC, id)` 和 `(created_at, id)` 一样大吗?
- 三个索引让插入 1 万行慢多少?第 10001 页 offset 和 keyset 差多少?
- 习题 1 · 去掉 `SET STATISTICS 1000` 后,计划会变吗:
- 习题 2 · `?q=查无` 的 p50;短关键词四种方案的好处 / 代价;需要什么数据:
- 习题 3 · 怎么判断 `tasks_title_c_id_idx` 值不值:

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
