# Day 18 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> 今天的代码都在 `nest-lab/` 里(`src/users/`、`src/tasks/dto/task-response.ts`、`src/serialization-demo/`),这个目录只放预测和默写。

## 1. 一个只写过前端的同事说:"接口返回什么我就渲染什么,页面上又没显示 `passwordHash`,有什么关系?GraphQL 不是只查需要的字段吗?"用外卖打包的比喻讲清楚,并说出这个比喻在哪里会骗人。

(在这里写)



## 2. 黑名单和白名单有什么区别?为什么新增一个敏感字段时黑名单会泄露?`ClassSerializerInterceptor` 遇到普通对象会怎样?

(在这里写)



## 3. nest-lab 为什么主线选显式映射而不是 `ClassSerializerInterceptor`?为什么去掉了 `{ data, timestamp }` 包装?去掉它的代价是什么?

(在这里写)



---

## ✍️ 预测区(习题 1–3:先写预测,再运行,再批改)

- 第 1 幕 A / B / C / D 各带出了哪些不该出门的字段:
- 第 2 幕新增 `resetToken` 后,四种方式谁泄露:
- 第 3 幕普通访客 / 管理员看到的 email 和 internalNote:
- 第 4 幕五种情况各出门几个字段:
- 第 5 幕 `GET /tasks/1` 的响应体长什么样?服务器时间在哪里?
- 习题 2:加了 `lastLoginIp` 之后,四个接口哪几个会带出它:
- 习题 3 · `return task` 的隐患:
- 习题 3 · `ctxLog(JSON.stringify(dto))` 的后果:
- 习题 3 · 前端拿不到服务器时间怎么办:

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
