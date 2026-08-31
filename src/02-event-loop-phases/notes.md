# Day 2 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。

## 1. event loop 的六个 phase 是什么?日常只需记哪三站、各装什么?用保安巡逻比喻讲一遍。

1. timer phrase(setTimeout, setInterval)
2. poll phrase (IO的回掉执行)
3. check phrase (setImmediate执行)
   相当于保安会把这三个按次序一次访问, 查看有没有问题, 有没有执行

## 2. 为什么在 I/O 回调里 setImmediate 一定先于 setTimeout(0),顶层却不确定?

I/O回掉里面是因为, I/O回掉结束之后, 下一个phrase 是 check phrase, 会执行SetImmediate, 然后回到timer阶段.
但是在顶层, 不一定,运行的时候, 不确定是从node哪个阶段进入的

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

- **ex1 思考题 3(原答案:顺序不变)❌ → 会变**:2026-08-31 实测,同样的注册放进 `readFile` 回调后输出 `[2][5][3][4]`,nextTick 重新优先。原因:ESM 顶层由 V8 主导求值,求值结束立刻排空自家 microtask 队列(反序特例);进了普通回调由 Node 主导清场,恢复 nextTick → microtask 的经典顺序。**「microtask 优先」只是 ESM 顶层特例,进了回调 nextTick 永远优先。**
- **ex2 思考题 3(原答案:塞进 I/O 回调保证顺序)半对**:「不能依赖顶层顺序」对,但塞进 I/O 回调是歪招。正解:① 用回调嵌套/链式把顺序写进代码结构;② 用语义明确的原语(Promise.then = 尽快,setImmediate = 本轮 I/O 之后,setTimeout = 下一圈)——原语的语义本身就是顺序保证。
- **ex3 思考题 4(原答案:例如 Web Worker)半对**:多线程/多进程方向对,但 Web Worker 是浏览器 API;**Node.js 里的治本方案是 `worker_threads`(或 child_process 子进程)** —— 就是 Day 1 说的「另雇一个磨粉工」。
- **默写 Q1(只写了三站)补全**:题目问的是六站全貌 —— ① timers(setTimeout/setInterval)→ ② pending callbacks(系统级,忽略)→ ③ idle/prepare(Node 内部,忽略)→ ④ poll(I/O 回调,中转站)→ ⑤ check(setImmediate)→ ⑥ close callbacks(close 事件)。日常只记 **timers / poll / check** 三站 + 记住 nextTick/microtask 两个编外窗口**不属于任何 phase**。另:拼写是 **phase**,不是 phrase。
- **默写 Q2(顶层「不确定从哪个阶段进入」)❌ → 路线永远固定**:loop 第一圈**永远从 timers 站开始**,不存在"从哪个阶段进入"的随机性。不确定的是:**脚本启动耗时是否超过那 1ms**(倒计时从 `setTimeout` 调用那刻起算)——超过了,timers 站巡到时铃铛已到期,T 先;没超过,timers 站空着,巡到 check,I 先。I/O 回调里确定,是因为回调执行时人已站在 poll 站,下一站固定是 check。
