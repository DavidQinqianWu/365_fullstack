# Day 25 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> 今天的实验都在 `nest-lab/` 里(`sql/day25/`、`scripts/day25-try.mjs`),这个目录只放预测和默写。

## 1. 一个只写过前端的同事问你:"我在前端用 `users.map(u => ({ ...u, tasks: tasks.filter(t => t.ownerId === u.id) }))` 拼数据,再 `reduce` 求和,这和 SQL 的 JOIN、GROUP BY 是一回事吗?为什么后端要在数据库里做?"用名册和订单本的比喻讲清楚,并说出这个比喻在哪里会骗人。

(在这里写)



## 2. INNER JOIN 和 LEFT JOIN 的区别是什么?LEFT JOIN 的条件放 ON 和放 WHERE 有什么不同?为什么反连接要用 NOT EXISTS 而不是 NOT IN?

(在这里写)



## 3. 什么是扇出?怎么识别、怎么修?WHERE 和 HAVING 的区别是什么,为什么 WHERE 里不能用 SELECT 的别名?

(在这里写)



---

## ✍️ 预测区(习题 1–3:先写预测,再运行,再批改)

- INNER JOIN 用户和任务几行?LEFT JOIN 几行?
- 「每个用户的未完成任务」:条件放 ON / 放 WHERE,Carol 出不出现?
- `FROM users, tasks` 忘了写条件,几行?
- 用 `NOT IN` 查基层员工能查出几个?用 `NOT EXISTS` 呢?
- `count(*)`、`count(estimate_minutes)`、`avg(estimate_minutes)` 各是多少?
- 只 `GROUP BY u.display_name` 却 SELECT 了 `u.email` 会怎样?
- Alice 的总时长在「三表 JOIN 再 SUM」时是多少?为什么?
- Carol 的完成率显示成什么?递归 CTE 一共几层?
- `<> 30` 和 `= 30` 加起来几行?表里几行?
- `WHERE 翻倍 > 60` 会怎样?
- 习题 1 · 加一个没有经理的「顾问」后,NOT IN / NOT EXISTS / 组织架构各怎么变?
- 习题 2 · 用户列表页那条查询会不会扇出?「所有任务都已完成」算不算 Carol?
- 习题 3 · 前端拼数据的代码在 1 万用户 / 100 万任务时传多少行、比较多少次?

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
