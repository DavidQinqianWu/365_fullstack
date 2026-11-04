# Week 3 概念卡默写

> 规则:闭卷,约 25 min(每张卡约 4 分钟:先写三段,下面的小问题能写多少写多少)。
> 每张卡必须有三部分 —— **通用定义**(不绑定语言)/ **Nest 里的样子** / **.NET、Java、Go 里的样子**。
> 写完再对照 Day 15–20 讲义订正,订正的地方用 **粗体** 标出。

---

## 卡片 1:HTTP 语义与 REST 资源设计(Day 15)

**通用定义:**

**Nest 里:**

**.NET / Java / Go 里:**

- 安全(safe)和幂等(idempotent)各是什么意思;GET / POST / PUT / PATCH / DELETE 各属于哪类:
- PUT 和 PATCH 的区别;「没给的字段」在两者里分别会怎样:
- 201 + Location、204、405 + Allow、409 分别什么时候用:
- 406 和 415 分别看哪个请求头;Nest 默认会帮你做哪些、不会做哪些:

---

## 卡片 2:DTO 与输入校验(Day 16)

**通用定义:**

**Nest 里:**

**.NET / Java / Go 里:**

- DTO 为什么要和内部模型分开(批量赋值是什么):
- `whitelist`、`forbidNonWhitelisted`、`transform` 各做什么:
- 400 和 422 的分界线:
- 嵌套数组校验要哪两个装饰器配合;少了一个会怎样:
- class-validator 和 zod 的取舍:

---

## 卡片 3:统一错误格式 problem+json(Day 17)

**通用定义:**

**Nest 里:**

**.NET / Java / Go 里:**

- RFC 9457 的五个标准字段,各给谁看:
- 调用方判断「是哪类错误」应该看哪个字段,为什么不看 `detail`:
- 扩展字段 `requestId`、`errors[].pointer` 是做什么的;JSON Pointer 长什么样:
- 500 的响应里不能出现什么:
- 错误类型目录(`docs/problems.md`)的作用:

---

## 卡片 4:响应 DTO 与防过度暴露(Day 18)

**通用定义:**

**Nest 里:**

**.NET / Java / Go 里:**

- 黑名单(`@Exclude`)和白名单(显式映射)在「内部模型新增一个敏感字段」时各会怎样:
- 为什么返回 `{ ...instance }` 或普通对象时 `ClassSerializerInterceptor` 会失效:
- 为什么去掉 `{ data, timestamp }` 包装:
- 「同一资源,不同角色看到不同字段」在 nest-lab 里怎么实现:

---

## 卡片 5:分页、过滤排序与版本化(Day 19)

**通用定义:**

**Nest 里:**

**.NET / Java / Go 里:**

- offset 分页为什么会重复 / 漏项;cursor 为什么不会;排序键为什么要补 id:
- 集合响应的形状、`limit` 的默认值和上限、为什么不给 total:
- 排序字段为什么必须白名单:
- 哪些变更是破坏性的、哪些不是;`Deprecation` / `Sunset` / `Link` 各表示什么:
- 忘了在创建 app 的地方开启版本化会怎样:

---

## 卡片 6:OpenAPI 与文档即契约(Day 20)

**通用定义:**

**Nest 里:**

**.NET / Java / Go 里:**

- code-first 和 contract-first 的区别、各自适合什么场景:
- 为什么 TS 的 DTO 必须贴 `@ApiProperty`,而 C# / Java 不用;CLI 插件在 nest-lab 里为什么没开:
- `openapi.json` 为什么要提交进 git;`openapi:check` 能证明什么、不能证明什么:
- 从 OpenAPI 生成的前端类型,运行时能保证什么、不能保证什么:

---

## 一句话总结(写完六张卡后)

- **「API 是对外契约」对我来说意味着:**
- **这一周哪一天的哪个决定,最能体现这句话:**
- **这份契约现在靠哪几样东西保证不被悄悄打破:**
