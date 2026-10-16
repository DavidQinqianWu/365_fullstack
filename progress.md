# 365 天全栈成长 · 进度记录

- 计数方式:**只按 Day N 计数,不写具体日期**——不要求每天连续学习,完成一天才算一天,Day N 永远 = 已完成天数 + 1。
- 当前进度:Day 5(进行中;Day 6–7 材料已备)
- 时间标准:按 `roadmap.md` 每天 1.5 小时。注:另一仓库的路线图 v2(3 小时/天、Hetzner 部署、365 平台主线项目)在合并时被覆盖,已确认**以当前 `roadmap.md` 为准**;v2 原文可在提交 `8ac8470` 中查看,Day 6–7 讲义按 v2 节奏编写,使用时酌情删减。⚠️ `hetzner` 主机是公司测试环境(Coolify + Traefik),不要部署学习项目,需要服务器时另租独立 VPS。
- 水平测试(Day 4 完成):**1 / 46**,全部 7 个领域从零起步,React/TS 深层知识为真实缺口。每个 Phase 结束重答对应题目,见 `docs/00-level-check/level-check.md`。
- 说明:第一轮(Day 1–8)的旧文件已归档至 `archive/round-1/`,供对照参考。

| Day | Phase | 任务 | GitHub 产出 | 状态 |
|---|---|---|---|---|
| Day 1 | Phase 1 / Week 1 | 服务端并发模型总览:三种并发模型(多线程/事件循环/协程)的概念卡 + 以 Node.js 为例初识 event loop(面馆比喻)+ 阻塞 vs 非阻塞小实验 | `docs/01-concurrency-models/Day 1 - 服务端是怎么同时接待很多人的.html` + `src/01-concurrency-models/` 练习代码与笔记 | 已完成 |
| Day 2 | Phase 1 / Week 1 | event loop 深入:六个 phase 巡场路线(重点 timers/poll/check)+ nextTick/microtask 清场顺序(含 ESM 顶层反序)+ setTimeout(0) vs setImmediate 不确定/确定规则 + 递归 nextTick 饿死 loop 与 setImmediate 分片让出 | `docs/02-event-loop-phases/Day 2 - event loop 的巡场路线:六个 phase 与清场顺序.html` + `src/02-event-loop-phases/` 练习代码与笔记 | 已完成 |
| Day 3 | Phase 1 / Week 1 | 流式 I/O:Buffer(字节周转箱:固定大小/共享内存/编码)+ Stream(传送带:内存恒定/即时开工)+ 四种流(Readable/Writable/Duplex/Transform)+ backpressure(write 红灯/drain 绿灯/highWaterMark)+ pipe vs pipeline;概念卡:流式处理与背压是语言无关通用概念 | `docs/03-streams-buffer/Day 3 - Stream 与 Buffer:后端的水管与水桶.html` + `src/03-streams-buffer/` 练习代码与笔记 | 已完成 |
| Day 4 | Phase 1 / Week 1 | 进程模型:单线程三块天花板(单核/CPU 硬菜卡全场/一崩全崩)+ 进程 vs 线程(分店 vs 服务员)+ child_process 四兄弟(exec/execFile/spawn/fork,maxBuffer 与 shell 注入两颗炸弹)+ fork IPC(拷贝不是共享)+ cluster(primary 店长分发与重启/worker 分店接客/共享端口原理);概念卡:多进程 vs 线程池 vs 协程是"共享 vs 隔离"的不同取舍,多机扩副本殊途同归 | `docs/04-process-model/Day 4 - 进程模型与 child_process · cluster:服务员不够用时,餐厅怎么开分店?.html` + `src/04-process-model/` 练习代码与笔记 | 已完成 |
| Day 5 | Phase 1 / Week 1 | 多线程:worker_threads(自带小灶的帮厨:同进程、独立 V8 isolate + event loop、默认不共享变量)+ 四种帮手地图(服务员 / libuv 洗碗工 / 帮厨 / 分店)+ 递东西三方式(structured clone 复印 / transfer 整箱交出去 / SharedArrayBuffer + Atomics 共用白板,竞态丢账)+ 线程池(池大小 ≈ 核数,CPU-bound vs I/O-bound,piscina);概念卡:先判断瓶颈是"等"还是"算" | `docs/05-worker-threads/Day 5 - worker_threads:分店太贵,那就在店里请个帮厨.html` + `src/05-worker-threads/` 练习代码与笔记 | 进行中 |
| Day 6 | Phase 1 / Week 1 | 裸写 HTTP 服务器:HTTP 报文就是有格式的纯文本(请求行/头/空行/体)+ 用 node:net 打印浏览器原话 + 五类状态码与 401/403 区别 + 幂等与客户端重试 + RFC 9457 problem+json 错误格式 + node:http 帮你做了什么 + **req/res 就是 Day 3 的流** + 三个必知 header(Content-Type / Content-Length vs chunked / keep-alive)+ 中文字节陷阱;习题:裸 TCP 看原文、不用框架写 REST API、Content-Length 与流式响应内存对比 | `docs/06-http-server/Day 6 - 裸写 HTTP 服务器:客人到底是怎么跟你说话的?.html` + `src/06-http-server/` 练习代码与笔记 | 待开始 |
| Day 7 | Phase 1 / Week 1 | **复盘日(不学新内容)**:画出「一个 HTTP 请求的一生」把 Day 1–6 串成一张图 + 六张概念卡闭卷默写(通用定义/Node/其他语言三段式)+ 对本周代码做 self code review(8 条清单,记录「当时为什么这么写」)+ 补 roadmap 跨语言对照表 3 行 + 自测 20 题(满分 36,低于 25 分需重看) | `docs/07-week1-review/Day 7 - 复盘日:把 Week 1 的六天连成一张图.html` + `src/07-week1-review/`(request-lifecycle / concept-cards / code-review / self-test 四份模板) | 待开始 |
