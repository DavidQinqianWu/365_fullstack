# Week 2 自测(闭卷)

> 今天必做 12 题(约 20 min):基础题 1 分 × 6,理解题 2 分 × 4,综合题 5 分 × 2,满分 24。
> **低于 17 分,开始 Week 3 前先把错题对应的那天重看一遍。**
> 末尾另有 8 道选做题,留给下周的碎片时间。

## 基础题(1 分 × 6)

1. Module、Controller、Provider 各管什么?为什么 Controller 不直接操作数据?

2. 为什么 `TasksService` 的构造函数要写 `@Inject(TASKS_REPOSITORY)`,而 `TasksController` 注入 `TasksService` 时不用写?

3. Nest 默认的 Provider 作用域是什么?REQUEST 作用域的「传染」是什么意思?

4. 按执行顺序写出 Nest 请求管线的五种站(出错时走哪一站)。

5. `@Public()` 这张标签是什么时候贴上去的?谁在什么时候读它?

6. 为什么不能用 `z.coerce.boolean()` 解析环境变量 `LOG_REQUESTS=false`?

## 理解题(2 分 × 4)

7. 没带钥匙的 `POST /tasks` 被拦下后,响应里为什么没有 `X-Response-Time`?错误体为什么没有被包装成 `{ data, timestamp }`?

8. 类上贴 `@Roles(['staff'])`、方法上贴 `@Roles(['admin'])`:`getAllAndOverride` 和 `getAllAndMerge` 各读出什么?为什么拼错 `SetMetadata` 的 key 不报错,而拼错 `config.get('DEMO_KEI', { infer: true })` 会编译报错?

9. 为什么单例 Service 的字段存 requestId 会串号,而 AsyncLocalStorage 不会?举出两个拿不到 ALS 值的地方。

10. `app.useGlobalInterceptors(new X())` 和 `{ provide: APP_INTERCEPTOR, useClass: X }` 有什么区别?为什么这个区别在写 e2e 测试时特别要紧?

## 综合题(5 分 × 2)

11. **场景题:**新同事给 nest-lab 加了导出功能,上线后出了三件怪事:① 他新建了 `ExportController`,为了让导出接口公开,在**类上**贴了 `@Public()`,又在同一个类里顺手加了 `DELETE /export/cache`,结果任何人不带钥匙都能清缓存;② 他在 `TasksController` 的**末尾**加了 `GET /tasks/stats`,调用却返回 400 `Validation failed (numeric string is expected)`;③ 有人反馈日志里同一个请求的 requestId 对不上,有几行是别的请求的 ID,还有几行干脆没有 ID。**请定位每个现象最可能的原因,并给出修法。**(提示:标签的就近原则、路由注册顺序、单例字段、`console.log`。)

12. **场景题:**Week 4 要把内存仓储换成 PostgreSQL。**列出哪些文件需要改、哪些文件完全不用改,并解释为什么不用改。**再说明:单元测试和 e2e 测试分别怎么保证「换仓储」这件事没有改坏业务逻辑?配置(数据库地址)应该怎么接入才能 fail fast?

---

## 我的答案

(写在这里)

---

## 得分:___ / 24

## 需要重看的天:

---

## 选做题(下周碎片时间,不计分)

13. 元数据装饰器和参数装饰器,各在什么时候执行、执行几次?

14. `design:paramtypes` 是谁写进去的?为什么用 tsx 直接跑 Nest 源码时构造函数注入会拿到 `undefined`?

15. 循环依赖是怎么出现的?为什么 `forwardRef` 应该是最后手段?

16. interceptor 的「去程」和「回程」为什么是同一个函数?用 `next.handle()` 解释。

17. 为什么全局保安要「默认拦、`@Public()` 放」,而不是「默认放、贴 `@Protected()` 才拦」?

18. 「类型」和「校验」分别在什么时候起作用?`JSON.parse(body) as Task` 的问题在哪?

19. 什么是 fail fast?nest-lab 配置写错时进程的退出码是多少?为什么这对部署平台有意义?

20. Go 为什么用 `context.Context` 显式传参,而不是像 ALS 那样隐式传?各自的取舍是什么?
