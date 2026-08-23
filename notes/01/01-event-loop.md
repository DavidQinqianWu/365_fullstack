# Day 1 — Node.js Event Loop 深入笔记

> 日期:2026-08-10 · Phase 1 / Week 1
> 实验代码:`src/01-event-loop/`(一个实验一个文件,结构见下)
> 环境:Node v24.15.0,macOS,Apple Silicon;运行方式 `node src/01-event-loop/xxx.ts`(Node 24 原生支持 type stripping)或 `npx tsx`

## 实验文件结构

按「一个实验一个文件」拆分,每次只观察一个问题:

| 文件 | 研究的问题 | 结论 |
|---|---|---|
| `01-sync-nexttick-microtask.ts` | 同步 vs nextTick vs microtask | ESM 顶层 microtask 先于 nextTick(CJS 相反) |
| `02-timeout-vs-immediate.ts` | 顶层 setTimeout(0) vs setImmediate | 不确定,取决于 loop 启动时 1ms 是否已过 |
| `03-io-callback.ts` | I/O callback 内注册的顺序 | 确定:nextTick → microtask → check → 下一轮 timers |
| `04-timer-ready.ts` | 如何锁定顶层顺序 | 先注册再忙等,让 timer 在 loop 启动时已到期 |
| `05-blocking-vs-chunked.ts` | 阻塞 vs 协作式分片 | 分片让 loop 保持响应(最大延迟 554ms → 3ms) |

> 为什么拆分:全部塞在一个文件里时,所有实验的 callback 会在同一个 event loop 里
> 按实际调度规则混合执行,输出"串台"——不是每个实验独立的答案。拆开之后每次只观察一个变量。

---

## 一、核心结论(5 句话版)

1. Node.js 的 event loop 是单线程的:任何同步 JS 代码运行期间,timer、I/O callback、microtask 全部排队等待,整个进程"冻结"。
2. 每个 tick 结束后的清场顺序(CJS 下)是:**nextTick queue → microtask queue(promise/queueMicrotask)→ 下一个 loop iteration**;nextTick 会完全排空,递归 nextTick 可以饿死 event loop。
3. **ESM 顶层是个例外**:ES module 求值结束时 V8 先排空 microtask queue,Node 的 nextTick queue 反而排在后面——面试标准答案"nextTick 优先"只在 CJS 成立。
4. `setTimeout(fn, 0)` 在 timers phase 执行,`setImmediate(fn)` 在 check phase 执行;顶层二者顺序**不确定**,但在 I/O callback 内部 setImmediate **必定**先于 setTimeout(因为 loop 已在 poll phase,下一站就是 check)。
5. 长任务拆片(`setImmediate` / `scheduler.yield`)能把 CPU 密集工作切成小块,让 loop 在片间处理 timer 和 I/O,是"协作式让出"保持服务响应的基本功。

---

## 二、实验 01–04:执行顺序

### 实验 01:同步 vs nextTick vs microtask(ESM 顶层)

标签按注册顺序编号,输出的乱序即真实调度顺序。实测:

```
[1] 同步:顶层代码
[6] 同步:顶层脚本结束
[3] promise.then:microtask(第 1 个注册)
[4] queueMicrotask:microtask(第 2 个注册,FIFO 排在 promise 之后)
[2] nextTick:第 1 个注册,但在 ESM 下输给 microtask
[5] nextTick:第 2 个回调 —— nextTick 队列自身是 FIFO,且会完全排空
```

要点:同步代码最先;然后 **microtask([3][4])反超 nextTick([2][5])**——这是 ESM 顶层特有行为。

### 实验 02:顶层 setTimeout(0) vs setImmediate(不确定)

实测(本次):

```
[S] 同步:注册完毕
[T] setTimeout(0):timers phase
[I] setImmediate:check phase
```

要点:timers phase 只执行**已到期**的 timer,`setTimeout(0)` 被钳制成 1ms。loop 启动时 1ms 到没到期,决定谁先来——多跑几次两种顺序都可能出现。**不要依赖这个顺序。**

### 实验 03:I/O callback 内部(确定)

标签按执行顺序编号,实测输出是干净的 1→7:

```
[1] 同步:主模块顶层
[2] I/O callback 开始 ← poll phase
[3] I/O callback 同步部分结束
[4] nextTick:回调结束后最先排空
[5] Promise:microtask 排在 nextTick 之后(回调内恢复经典顺序)
[6] setImmediate:check 紧接 poll,先于下一轮 timers
[7] setTimeout(0):下一轮 iteration 的 timers phase
```

要点:回调执行时 loop 处于 poll phase,下一站必然是 check,所以 **setImmediate 永远赢 setTimeout(0)**;而且回调内部不再是 ESM 顶层特殊情况,nextTick 恢复优先于 microtask。

### 实验 04:把不确定变成可控(先注册,再忙等)

实测(连跑 3 次完全一致):

```
[S] 同步:忙等结束,event loop 即将启动
[T] setTimeout(0):稳定先跑(timer 已到期)
[I] setImmediate:稳定后跑(check 排在 timers 之后)
```

要点:**timer 的 1ms 倒计时从 `setTimeout` 调用那一刻起算,不是从 loop 启动起算。** 先注册、再忙等 3ms,loop 启动时 timer 必然已到期 → setTimeout 稳定先跑。反例:先忙等、再注册则毫无效果(第一版就写反了,被实测抓出来)。

### 六种场景速查表

| 场景 | 顺序 | 是否确定 |
|---|---|---|
| 同步代码 vs 一切队列 | sync 永远最先(它就是当前 tick) | 确定 |
| **CJS 顶层**:nextTick vs microtask | nextTick 先,microtask 后 | 确定 |
| **ESM 顶层**:nextTick vs microtask | **microtask 先,nextTick 后**(实验 01 实测) | 确定(但反直觉) |
| promise.then vs queueMicrotask | 同一 microtask queue,FIFO 按注册顺序 | 确定 |
| 顶层 setTimeout(0) vs setImmediate | 取决于 loop 启动时 1ms 是否已过 | **不确定** |
| 顶层:先注册、再忙等 3ms(实验 04) | setTimeout 先(倒计时从注册起算,loop 启动时已到期) | 确定(人为锁定) |
| I/O callback 内 setTimeout(0) vs setImmediate | setImmediate 先(check 紧接 poll) | 确定 |
| I/O callback 内 nextTick vs 其他 | nextTick 依然最先 | 确定 |

### 关键理解

- **nextTick 不属于 event loop 的任何 phase**,它是 Node 自己维护的队列,在每次"JS 栈清空后、继续 loop 之前"排空。microtask queue 是 V8 的(promise、queueMicrotask),两者清场顺序在 CJS 是 nextTick 优先。
- ESM 顶层反序的原因:ES module 的求值由 V8 驱动,求值结束 V8 立即排空自己的 microtask queue;Node 的 nextTick 处理发生在更外层,所以排在后面。进入普通 callback(如 I/O)后,恢复 nextTick 优先。
- 顶层 setTimeout(0) vs setImmediate 不确定:脚本启动耗时若在 1ms 以内,timers phase 里 timer 还没到期,先看 check(setImmediate 先);若启动超过 1ms,timer 已到期(setTimeout 先)。**写代码永远不要依赖这个顺序。**
- **timer 的倒计时从 `setTimeout` 调用那一刻起算,不是从 loop 启动起算。** 所以「先注册、再忙等 3ms」能把顺序锁定为 setTimeout 先(实验 04 实测 3 次全一致);反过来「先忙等、再注册」毫无效果。

---

## 三、实验 05:阻塞 vs 协作式分片

用心跳 timer(每 100ms 一次,记录实际延迟)对比两种跑 12 亿次 `Math.sqrt` 的方式。

### 实测数据

| | CASE 1 一次性同步跑 | CASE 2 setImmediate 分片(每片 1000 万次) |
|---|---|---|
| 总耗时 | 654ms | 673ms(几乎没变慢) |
| 心跳次数 | 3 次(堵完后补发) | 9 次(全程正常) |
| 最大延迟 | **554ms** | **3ms** |
| 表现 | loop 冻结,心跳积压后爆发 | loop 始终响应 |

### 关键理解

- **单线程 = 同步代码即世界**。那 654ms 里,timer、I/O、HTTP 请求处理全部停摆——这就是"一个 JSON.parse 大对象就能打挂 Node 服务"的原因。
- 分片的代价极小(总耗时 +3%),收益是数量级的(最大延迟 554ms → 3ms)。
- `setImmediate` 把下一片放进 check phase,timers 和 pending I/O 有机会在片间插入执行;若用递归 `nextTick` 分片反而会饿死 loop(nextTick 排空前 loop 不前进),**让出必须用 setImmediate/setTimeout,不能用 nextTick**。
- 真正的生产方案:CPU 密集任务交给 `worker_threads` 或子进程,分片只是"没法移出主线程"时的止血手段。

---

## 四、今天踩的坑(项目配置)

1. `"type": "commonjs"` 与实验代码的 ESM 语义、`import.meta.filename` 冲突,`tsc` 报 TS1470 → 改为 `"type": "module"`。
2. tsconfig `"types": []` 把已装的 `@types/node` 排除,`process`/`setImmediate`/`node:fs` 全部类型报错 → 改为 `"types": ["node"]`。
3. 文件头 Run 注释路径写错(`src/event-loop/` → 实际 `src/01-event-loop/`)。
4. 新增 `npm run typecheck`(`tsc --noEmit`)做日常验证。
5. 合并版 `order.ts` 四个实验互相"串台"(所有 callback 在同一个 event loop 里混合调度)→ 按「一个实验一个文件」拆成 01–04。

**教训:实验代码的结论依赖运行时语义(CJS/ESM),配置文件必须先和实验假设对齐;同理,实验设计要先隔离变量,否则"碰巧跑对"或"看起来奇怪"都会浪费排查时间。**

---

## 五、自问自答(检验理解)

**Q: 为什么递归 `process.nextTick` 会卡死进程,而递归 `setImmediate` 不会?**
A: 每次清场时 nextTick queue 会被完全排空,新注册的 nextTick 又进同一个队列,循环永远排不空,event loop 永远无法进入下一个 phase;setImmediate 注册的下一次执行在**下一轮** loop 的 check phase,本轮 loop 照常走完,timers/I/O 都有机会执行。

**Q: `setTimeout(fn, 0)` 真的是 0ms 后执行吗?**
A: 不是。0 会被当作 1ms,且只是"最早可在下一个 timers phase 执行";若 loop 被同步代码或长 callback 堵住,实际延迟可能远超 1ms(实验 05 里实测 554ms)。

**Q: Promise 回调和 setTimeout(0) 谁先?**
A: Promise 回调是 microtask,在当前 tick 结束、loop 进入下一个 phase 之前就执行;setTimeout(0) 最快也要等下一个 loop iteration 的 timers phase。所以 promise 永远先。

**Q: 为什么 I/O 回调里 setImmediate 一定先于 setTimeout(0),顶层却不一定?**
A: I/O 回调执行时 loop 已在 poll phase,下一站必然是 check(setImmediate),与 timer 是否到期无关;顶层则要经过 timers phase,而 timers phase 只跑到期的 timer——setTimeout(0) 的 1ms 到没到期,取决于脚本启动耗时,所以不确定。
