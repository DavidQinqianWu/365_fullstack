# Day 22 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> 今天的实验都在 `nest-lab/` 里(`compose.yaml`、`sql/day22/`、`scripts/day22-try.mjs`),这个目录只放预测和默写。

## 1. 一个只写过前端的同事问你:"前端有 `localStorage` 和 IndexedDB,数据刷新也不丢。后端为什么不直接把数据放在 Node 进程的内存里,非要再起一个数据库?"用中央账房的比喻讲清楚,并说出这个比喻在哪里会骗人。

(在这里写)



## 2. PostgreSQL 里「集群、数据库、schema、表、行、列」是什么关系?psql 的 SQL 和元命令有什么区别?提示符 `=>`、`->`、`=#` 各在告诉你什么?

(在这里写)



## 3. CRUD 四个语句和 HTTP 方法怎么对应?回执里的数字有什么用?忘了 `WHERE` 会怎样,有哪两种办法保命?

(在这里写)



---

## ✍️ 预测区(习题 1–3:先写预测,再运行,再批改)

- 第 2 幕:三个 psql 同时连上,服务器看到几个连接?pid 一样吗?客户端 pid 和后端 pid 是同一个数吗?退出之后呢?
- 重启数据库服务之后,表里的数据还在吗?
- `\l` 会列出几个库?`\c postgres` 前后 `pg_backend_pid()` 一样吗?在 `postgres` 库里 `SELECT * FROM tasks` 会怎样?
- 分三行敲 / 忘了分号 / 引号没闭合 / 括号没闭合时,提示符各是什么样:
- `\d tasks` 里哪几列是 not null:
- `BEGIN` 后忘写 WHERE 的 `UPDATE` / `DELETE` 回执是几?`ROLLBACK` 后还剩几行?
- 没有 `BEGIN` 时 `DELETE … WHERE id = 4; ROLLBACK;`,第 4 行回来了吗?
- 不写 `ORDER BY` 时返回什么顺序?改一行之后呢?
- 按 `id` 找和按 `title` 找,执行计划一样吗?
- 习题 1 · 两个终端时 `pg_stat_activity` 有几行、各自的 state / query:
- 习题 2 · 五个请求的 SQL、预测回执、nest-lab 应回的状态码;`?sort=-createdAt` 的 SQL:
- 习题 3 · `WHERE id = $1` 的 id 变成 undefined 会怎样,哪一层先拦住:

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
