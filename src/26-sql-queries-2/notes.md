# Day 26 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> 今天的实验都在 `nest-lab/` 里(`sql/day26/`、`docs/er-diagram.md`、`scripts/day26-try.mjs`),这个目录只放预测和默写。

## 1. 一个只写过前端的同事问你:"前端 `new Date().toISOString()` 出来就是带 Z 的 UTC,显示时用 `Intl.DateTimeFormat` 换时区;我平时也爱把一整个对象 `JSON.stringify` 塞进 localStorage。数据库里的 timestamptz 和 JSONB 是不是一回事?"用「写清是哪里的几点」和「订单背面的便条」两个比喻讲清楚相同和不同,并说出比喻在哪里会骗人。

(在这里写)



## 2. 窗口函数和 GROUP BY 有什么区别?「每组最新一条」有哪三种写法,各适合什么时候?为什么窗口函数不能写在 WHERE 里?

(在这里写)



## 3. UPSERT 怎么解决并发注册?和 Day 24「靠唯一约束报错」比有什么不同?`DO NOTHING` 的 RETURNING 有什么坑?RETURNING 在 Day 27 的 POST / PATCH / DELETE 里各有什么用?

(在这里写)



---

## ✍️ 预测区(习题 1–3:先写预测,再运行,再批改)

- GROUP BY 几行?加了 `count(*) OVER (PARTITION BY owner_id)` 的查询几行?
- 两个 30 分钟的任务在 row_number / rank / dense_rank 里各排第几?下一个呢?
- 每组最新的三种写法结果一样吗?Carol 出现在哪一种里?
- `ON CONFLICT DO NOTHING` 插已存在邮箱的回执?Dave 的 id 是几?`ON CONFLICT (display_name)` 会怎样?
- `DO NOTHING RETURNING id` 能拿回已存在的 urgent 的 id 吗?
- UPSERT 并发注册:第二个请求报错吗?COMMIT 还是 ROLLBACK?
- `UPDATE … WHERE id = 999 RETURNING` 返回什么?同一个任务删两次呢?
- JSONB 里写类型不对 / 键名拼错 / 不存在的 id,会报错吗?同样的坏清单项进子表呢?
- 上海写入的 17:00,柏林会话读出来两种类型各是几点?两行 timestamptz / timestamp 各相差多少?
- 柏林 2026-03-28 12:00 加 1 day / 24 hours 各是几点?
- 习题 1 · Bob 两个任务 created_at 相同时三种写法还一致吗?去掉 `id DESC` 呢?DISTINCT ON 能做 Top-2 吗?
- 习题 2 · 第二条语句失败时第一条插入的任务还在吗?
- 习题 3 · 截止时间 / 每天 8 点提醒的类型;支付回调怎么建表;柏林 24 小时 vs 明天同一时间的 UTC 时刻:

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
