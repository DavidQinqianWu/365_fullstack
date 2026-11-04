# Day 38 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> 今天的实验都在 `nest-lab/` 里(`sql/day38/`、`scripts/day38-try.mjs`),这个目录只放预测和默写。

## 1. 一个只写过前端的同事说:"React 里每次 setState 都产生一个新对象,旧对象没人引用了就被 GC 回收;git 的每次提交也保留旧版本。数据库的 MVCC 是一回事吗?"用「账本从不涂改」的比喻讲清楚行版本、快照和 VACUUM,并说出这个比喻在哪里会骗人。

(在这里写)



## 2. 普通 VACUUM 和 VACUUM FULL 各做了什么?为什么 VACUUM 之后文件没变小,表也不会再无限变大?autovacuum 什么时候触发,为什么大表要单独调?

(在这里写)



## 3. 长事务为什么会让表膨胀?哪几种「挂着的事务」会挡住清理,哪种不会?怎么在线上找出它们、怎么兜底?

(在这里写)



---

## ✍️ 预测区(习题 1–3:先写预测,再运行,再批改)

- UPDATE 之后 `ctid` 和 `xmin` 怎么变?回滚的 UPDATE 会在旧行上留下什么?
- pageinspect:`items` 第 0 页上有几个版本?VACUUM 之后呢?回滚的那次更新留下了什么?
- A(RR)读了 id=1,B +100 并提交:A、B 各看到多少?B 要等 A 吗?
- 20 万行全表 UPDATE 3 遍,表从 16 MB 变成多大?VACUUM 之后?再 UPDATE 一遍?VACUUM FULL 之后?
- VACUUM 前后 Index Only Scan 的 Heap Fetches 各是多少?
- `bloat` 的默认 autovacuum 触发线是多少?`av_demo`(阈值 50)多久会被自动清理?
- RC 只读、RR 只读、RC 写过的三种空闲事务,哪几种挡住了 VACUUM?
- 习题 1 · 窗口 B 能查到 A 吗?设了 `idle_in_transaction_session_timeout` 之后 A 会怎样?这次是 HOT 更新吗?
- 习题 2 · `tasks` 表的触发线、按表参数;30 秒外部调用对 VACUUM 和连接池的影响;监控 SQL:
- 习题 3 · 为什么 PG 回滚快,代价是什么:

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
