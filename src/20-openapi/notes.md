# Day 20 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> 今天的代码都在 `nest-lab/` 里(`src/openapi.ts`、`src/common/problems/problem.schema.ts`、`dto/*-response.ts`、`openapi.json`、`docs/api-design.md`),这个目录只放预测和默写。

## 1. 一个只写过前端的同事问你:"我能不能从后端的 OpenAPI 自动生成 axios 请求函数和 TS 类型,不再手写 interface?生成出来的类型能保证运行时拿到的数据就是这个形状吗?"用菜单册的比喻讲清楚,并说出这个比喻在哪里会骗人。

(在这里写)



## 2. code-first 和 contract-first 的区别是什么?nest-lab 为什么不开 `@nestjs/swagger` 的 CLI 插件?

(在这里写)



## 3. nest-lab 用哪几层手段保证「文档、代码、真实响应」一致?每一层分别防住了什么、防不住什么?

(在这里写)



---

## ✍️ 预测区(习题 1–3:先写预测,再运行,再批改)

- 第 1–2 幕:文档里一共几个操作?`/tasks`、`/v2/tasks`、`/v1/tasks` 各出现几次?`@All()` 兜底路由在不在?
- 第 2 幕:`PATCH /v2/tasks/{id}` 声明了哪些状态码:
- CLI 插件实验:① 无插件无标签 ② 开插件 nest build ③ 开插件 vitest,`ReplaceTaskDto` 各是什么样:
- 映射函数多一个字段 / 少一个字段 / 字段忘了贴 `@ApiProperty`,各在哪一步失败:
- 第 3 幕:`CreateTaskDto` 必填字段、`UpdateTaskDto` 必填字段、`GET /v2/tasks` 的参数:
- 第 4 幕:8 条自动检查里哪条最可能失败:
- 改一个 summary 不重新生成,`openapi:check` 的结果:
- 第 5 幕:`nextCursor` 生成的 TS 类型是 `string | null` 还是 `nextCursor?: string`:
- 第 6 幕:生产环境下 `/docs-json`、`/docs`、`/v2/tasks` 的状态码:
- 习题 1 · Swagger UI 不点 Authorize 发 POST / 发空标题 / 正常请求的 Location:
- 习题 2 · 加 `checklistDone` 时三种「漏一步」各在哪失败?需要发 v3 吗?
- 习题 3 · contract-first 下前端怎么先开工;`openapi:check` 应该反过来检查什么;两份 maxLength 怎么防不一致:

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
