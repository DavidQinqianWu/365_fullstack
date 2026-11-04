# Week 2 代码 self-review(nest-lab)

> 用「别人写的代码」的眼光,看一遍 `nest-lab/src/`、`nest-lab/test/`、`nest-lab/scripts/`。
> 目标:至少找出 2 个问题。一个都没找到 = review 得不够仔细。
> 复盘日不改功能:问题先记下来,改法写清楚,真正动手放到 Week 3。

## Review 清单(逐条打勾)

- [ ] 有没有单例 Service / guard / interceptor 把「请求级数据」存在字段上(Day 9 / 13)
- [ ] 有没有接口忘了贴 `@Public()`(该公开却 403)或忘了贴 `@AdminOnly()`(该限制却放行)(Day 11)
- [ ] 元数据 key 有没有手写字符串、没用常量或 `Reflector.createDecorator`(Day 11)
- [ ] 有没有直接读 `process.env.XXX`,绕过了 zod 校验和 `ConfigService`(Day 12)
- [ ] 有没有需要依赖的全局切面还在用 `app.useGlobalXxx(new X())`(Day 10 / 13)
- [ ] 有没有日志用了 `console.log` 而没走 `ctxLog`,导致缺少 requestId(Day 13)
- [ ] 有没有把「可伪造的请求头」当成可信身份(`x-demo-role`、`x-request-id`)(Day 11 / 13)
- [ ] 有没有不必要的 REQUEST 作用域 Provider,把整条链拖成「每请求重造」(Day 9)

---

## 发现的问题

### 问题 1

**文件:** `nest-lab/src/xx/yy.ts` 第 N 行
**问题:**
**后果:**
**改法:**
**我当时为什么这么写:**

### 问题 2

**文件:**
**问题:**
**后果:**
**改法:**
**我当时为什么这么写:**

### 问题 3(选做)

**文件:**
**问题:**
**后果:**
**改法:**
**我当时为什么这么写:**

---

## 我发现的思维盲区(从上面的「当时为什么这么写」里总结)

