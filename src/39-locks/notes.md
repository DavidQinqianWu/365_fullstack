# Day 39 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> 今天的实验都在 `nest-lab/` 里(`sql/day39/`、`scripts/day39-try.mjs`),这个目录只放预测和默写。

## 1. 一个只写过前端的同事说:"我做防重复点击会把按钮 disabled;浏览器的 `navigator.locks.request` 能让多个标签页里同一时刻只有一个在跑;我还写出过两个 Promise 互相等对方导致页面卡死。数据库里也有这些吗?"用「镇纸」和「值班牌」的比喻讲清楚行锁、死锁和咨询锁,并说出这个比喻在哪里会骗人。

(在这里写)



## 2. 为什么一个 `ALTER TABLE` 能让一个和它无关的 SELECT 超时?怎么用 `lock_timeout` 避免?

(在这里写)



## 3. SKIP LOCKED 队列为什么不会重复领任务、也不用互相等?去掉 SKIP LOCKED 会怎样?它为什么不能用在一般的业务查询里?

(在这里写)



---

## ✍️ 预测区(习题 1–3:先写预测,再运行,再批改)

- A `FOR UPDATE` 锁住 1 号:B 普通读、UPDATE(lock_timeout 500ms)、`FOR UPDATE NOWAIT`、`FOR SHARE NOWAIT`、插一笔引用它的转账,各会怎样?
- A 换成普通 UPDATE:B 插转账会怎样?`FOR NO KEY UPDATE NOWAIT` 呢?
- 4 个 worker 领 200 个任务:有没有重复处理?各分到多少?用时多少?去掉 SKIP LOCKED 呢?
- A 读事务挂着、B ALTER TABLE、C 普通 SELECT:C 会被挡住吗?被谁挡住?
- B 设 lock_timeout 200ms 并重试:第几次成功?C 被挡多久?
- 相反顺序改两行:多久后、谁报错?DETAIL 写了什么?按 id 顺序 FOR UPDATE 之后呢?
- 3 个连接同时 `pg_try_advisory_lock(42)`:几个返回 true?会话级的锁 COMMIT 之后还在吗?
- 习题 1 · 「挡路者状态」是什么?换成长查询呢?改 deadlock_timeout 后谁先报错?两个窗口领到的 id:
- 习题 2 · PUT 的修法(FOR UPDATE 还是 FOR NO KEY UPDATE);归档任务的咨询锁伪代码;加列的安全迁移步骤:
- 习题 3 · worker 崩溃 / 卡住时任务怎么办:

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
