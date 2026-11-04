# Day 37 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> 今天的实验在 `nest-lab/sql/day37/`、`nest-lab/scripts/day37-try.mjs`;重试辅助函数在本目录的 `with-retry.ts`(自检:`node src/37-isolation-levels/with-retry.check.ts`)。

## 1. 一个只写过前端的同事说:"两个浏览器标签页同时编辑同一份文档,后保存的把先保存的覆盖了。数据库里也会这样吗?隔离级别能解决吗?"用「各自抄下来、各自算、各自填回去」的比喻讲清楚丢失更新,说出 Read Committed 和 Repeatable Read 下各会怎样,并说出这个比喻在哪里会骗人。

(在这里写)



## 2. 不可重复读和幻读有什么区别?PostgreSQL 的 Read Committed 和 Repeatable Read 各用什么时候的快照?为什么 PostgreSQL 里复现不出脏读?

(在这里写)



## 3. 写偏斜是什么?为什么 Repeatable Read 拦不住它?Serializable 拦下它之后,应用要怎么重试,为什么不能只重试最后一条语句?

(在这里写)



---

## ✍️ 预测区(习题 1–3:先写预测,再运行,再批改)

- `BEGIN ISOLATION LEVEL READ UNCOMMITTED` 之后 `SHOW transaction_isolation` 显示什么?查询之后再 `SET TRANSACTION` 会怎样?
- 脏读:T2 用 READ UNCOMMITTED 读 T1 没提交的 999,读到多少?
- 不可重复读 / 幻读:RC 和 RR 下 T2 第二次各读到什么?
- 丢失更新:两人都读到 0、都写回 1,RC 下最后是多少?RR 下呢?
- 原子自增 `SET n = n + 1`:RC 下最后是多少?RR 下呢?
- 写偏斜(值班医生、每人最多 3 个):RR 能拦住吗?SER 在哪一步报错?
- 重试演示:RR 下最终 n 是多少?SER 下最后几个人请假成功?
- 习题 1 · SER 下反过来提交,报错的是谁?只读的 T2 会报错吗?原子自增卡住时的 `wait_event`:
- 习题 2 · nest-lab 的 PUT 是哪种异常;「每人最多 100 个」的三种实现;重试会不会建出两条:
- 习题 3 · `deadline` 的设计:

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
