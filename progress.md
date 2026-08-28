# 365 天全栈成长 · 进度记录

- 计数方式:**只按 Day N 计数,不写具体日期**——不要求每天连续学习,完成一天才算一天,Day N 永远 = 已完成天数 + 1。
- 当前进度:Day 3(进行中,习题待学员完成)
- 说明:第一轮(Day 1–8)的旧文件已归档至 `archive/round-1/`,供对照参考。

| Day | Phase | 任务 | GitHub 产出 | 状态 |
|---|---|---|---|---|
| Day 1 | Phase 1 / Week 1 | 服务端并发模型总览:三种并发模型(多线程/事件循环/协程)的概念卡 + 以 Node.js 为例初识 event loop(面馆比喻)+ 阻塞 vs 非阻塞小实验 | `docs/01-concurrency-models/Day 1 - 服务端是怎么同时接待很多人的.html` + `src/01-concurrency-models/` 练习代码与笔记 | 已完成 |
| Day 2 | Phase 1 / Week 1 | event loop 深入:六个 phase 巡场路线(重点 timers/poll/check)+ nextTick/microtask 清场顺序(含 ESM 顶层反序)+ setTimeout(0) vs setImmediate 不确定/确定规则 + 递归 nextTick 饿死 loop 与 setImmediate 分片让出 | `docs/02-event-loop-phases/Day 2 - event loop 的巡场路线:六个 phase 与清场顺序.html` + `src/02-event-loop-phases/` 练习代码与笔记 | 待完成 |
| Day 3 | Phase 1 / Week 1 | 流式 I/O:Buffer(字节周转箱:固定大小/共享内存/编码)+ Stream(传送带:内存恒定/即时开工)+ 四种流(Readable/Writable/Duplex/Transform)+ backpressure(write 红灯/drain 绿灯/highWaterMark)+ pipe vs pipeline;概念卡:流式处理与背压是语言无关通用概念 | `docs/03-streams-buffer/Day 3 - Stream 与 Buffer:后端的水管与水桶.html` + `src/03-streams-buffer/` 练习代码与笔记 | 待完成 |
