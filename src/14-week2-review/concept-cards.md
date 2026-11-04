# Week 2 概念卡默写

> 规则:闭卷,约 25 min(每张卡约 4 分钟:先写三段,下面的小问题能写多少写多少)。
> 每张卡必须有三部分 —— **通用定义**(不绑定语言)/ **Nest 里的样子** / **.NET、Java、Go 里的样子**。
> 写完再对照 Day 8–13 讲义订正,订正的地方用 **粗体** 标出。

---

## 卡片 1:框架三件套与装饰器(Day 8)

**通用定义:**

**Nest 里:**

**.NET / Java / Go 里:**

- framework 和 library 的区别(谁调用谁):
- Module / Controller / Provider 各管什么,为什么要分开:
- 装饰器「贴」和「读」分别发生在什么时候;只贴不读会怎样:

---

## 卡片 2:依赖注入与作用域(Day 9)

**通用定义:**

**Nest 里:**

**.NET / Java / Go 里:**

- 为什么不自己 `new`(两个好处):
- IoC 容器启动时的四步:
- token 是什么;为什么接口类型的依赖要 `@Inject(TOKEN)`:
- singleton / request / transient 各造几个;「传染」是什么,代价是什么:

---

## 卡片 3:AOP 与管线五件套(Day 10)

**通用定义:**

**Nest 里:**

**.NET / Java / Go 里:**

- 横切关注点举 4 个例子:
- aspect / advice / pointcut 各是什么:
- 五件套的执行顺序,每站「能拿到什么」:
- 异常短路:为什么被 guard 拦下的响应没有计时头,错误体为什么没被包装:

---

## 卡片 4:自定义装饰器与默认上锁(Day 11)

**通用定义:**

**Nest 里:**

**.NET / Java / Go 里:**

- `SetMetadata` vs `Reflector.createDecorator`;拼错 key 会怎样:
- `get` / `getAllAndOverride` / `getAllAndMerge` 的区别:
- 元数据装饰器 vs 参数装饰器:各在什么时候执行、执行几次:
- 为什么「默认拦、`@Public()` 放」比「默认放、贴了才拦」安全:

---

## 卡片 5:类型 ≠ 校验与 fail fast(Day 12)

**通用定义:**

**Nest 里:**

**.NET / Java / Go 里:**

- `unknown` vs `any`;`as` 为什么不安全:
- zod「一份定义两用」是哪两用;校验该放在哪里:
- `process.env` 的坑(数字、布尔各一个例子):
- fail fast 是什么;nest-lab 配置错时在哪一步、以什么方式失败:

---

## 卡片 6:请求上下文与全局切面的 DI 版(Day 13)

**通用定义:**

**Nest 里:**

**.NET / Java / Go 里:**

- 为什么并发请求的日志会交错:
- AsyncLocalStorage 跟着什么走;哪些地方拿不到:
- 为什么单例字段存 requestId 会串号:
- `useGlobalXxx(new X())` vs `APP_*`:能不能注入、e2e 里自不自动生效:

---

## 两大支柱(写完六张卡后,用各一句话总结)

- **IoC 解决的问题:**
- **AOP 解决的问题:**
- **它们在 nest-lab 里合作的一个例子:**
