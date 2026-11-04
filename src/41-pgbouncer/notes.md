# Day 41 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> 今天的实验都在 `nest-lab/` 里(`pgbouncer/`、`sql/day41/`、`scripts/day41-try.mjs`、`docs/db-timeouts.md`),这个目录只放预测和默写。

## 1. 一个只写过前端的同事说:"浏览器在 HTTP/1.1 下对同一个域名最多同时开 6 个连接,多出来的请求就排队;HTTP/2 一个连接上能同时跑很多请求。后端连数据库也是这样吗?连接开多一点不是更快吗?"用「叫号台」的比喻讲清楚应用连接池、PgBouncer 和 max_connections,并说出 HTTP/2 多路复用和 PgBouncer 哪里像、哪里不像。

(在这里写)



## 2. nest-lab 部署了 6 个副本,每个 `DB_POOL_MAX=20`,上线后一部分请求报 `sorry, too many clients already`。为什么?有哪几种修法?换成 PgBouncer 的 transaction 模式之后,代码里有哪些写法会出问题(至少说三种),各自怎么改?

(在这里写)



## 3. 超时三件套分别防的是什么事故?为什么 nest-lab 推荐把它们设在「应用专用角色」上,而不是连接参数或 `SET` 里?`idle_in_transaction_session_timeout` 到点之后,应用这边会看到什么、连接池怎么恢复?

(在这里写)



---

## ✍️ 预测区(先写预测,再运行,再批改)

- 第 1 幕:打开 40 个连接要多久?每个后端进程多少内存?200 次「新建连接 + SELECT 1」和用池子各要多久?
- 第 2 幕:6 × 20 = 120 个连接直连,成功几个?失败的报什么?
- 第 3 幕:2 / 5 / 20 / 80 个并发连接,吞吐和 p50 延迟各是多少?(本机 4 核)
- 第 4 幕:120 个客户端经过 PgBouncer(transaction,pool 20):有没有失败?PostgreSQL 里最多几个后端进程?session 模式 800 ms 后完成几条?statement 模式下 `BEGIN` 会怎样?
- 第 5 幕:A `SET statement_timeout`(不带 LOCAL)之后,B 开事务看到什么?A 自己再查看到什么?A 的会话级咨询锁,B `pg_try_advisory_lock` 得到什么?
- 第 6 幕:`max_prepared_statements = 0` 时,具名语句第 2 次执行、别的客户端用同一个名字,各报什么?改成 100 呢?
- 第 7 幕:`idle_in_transaction_session_timeout = 500ms`,发呆 800 ms 后再查:收到什么?池子之后还能用吗?
- 第 8 幕:nest-lab 原样连 6432 会怎样?忽略 `options` 之后呢?
- 习题 1 · 手动做 `03-session-state.sql` 的结果:
- 习题 2 · `npm run test:e2e:pgbouncer` 的结果;把 `default_pool_size` 改成 2 再跑一次:
- 习题 3 · 给 nest-lab 定连接数和超时值的推理:

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
