# Day 16 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> 今天的代码都在 `nest-lab/` 里(`src/tasks/dto/`、`src/common/validation/`),这个目录只放预测和默写。

## 1. 一个只写过前端的同事问你:"我们前端已经用 react-hook-form + zod 校验过了,后端为什么还要再校验一遍?DTO 又是什么?"用海关比喻讲清楚,并说出这个比喻在哪里会骗人。

(在这里写)



## 2. 全局 ValidationPipe 的三道工序分别是什么?`whitelist` 和 `forbidNonWhitelisted` 有什么区别?为什么开了 `transform` 以后 `:id` 上还要 `ParseIntPipe`?

(在这里写)



## 3. nest-lab 为什么选 422 而不是 400?为什么主线选 class-validator 而不是 zod?「已完成的任务不能改标题」为什么不能写进 DTO?

(在这里写)



---

## ✍️ 预测区(习题 1–3:先写预测,再运行,再批改)

- 习题 1 · A–K 的状态码:A __ B __ C __ D __ E __ F __ G __ H __ I __ J __ K __
- 习题 1 · E 的错误路径长什么样?I 之后清单还剩几项?
- 习题 1 · `{"title":"x","checklist":"买菜"}` 会报几条错误?
- 习题 1 · 第 2 幕 `'abc'` 经过全局 pipe 变成什么?`transform: false` 时 body 是不是 DTO 实例?
- 习题 1 · 第 3 幕三种配置分别拿到什么?
- 习题 1 · 第 4 幕两种写法有没有结论不一致的?第 5 幕大概差几倍?
- 习题 2 · 加了 `priority` 后,`POST {title, priority}` 和 `PATCH {priority}` 分别怎样?priority 会被存下来吗?
- 习题 2 · 改成 `import type { CreateTaskDto }` 后,build 会报错吗?`POST {}` 得到什么?
- 习题 3 · 前端把 GET 拿到的整条任务原样 PUT 回来,nest-lab 返回什么?两种解决方式各自的优缺点:

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
