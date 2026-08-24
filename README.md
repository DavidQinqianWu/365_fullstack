# 365_SFS · 365 天高级全栈工程师成长计划

> 7 年前端经验 → 高级全栈工程师。全 TypeScript 栈(Next.js + Node.js/NestJS)+ PostgreSQL + 云部署 + 系统设计 + AI Engineering。
> 每天 2 小时,每天都有 GitHub 可见产出。完整路线见 [roadmap.md](roadmap.md),每日记录见 [progress.md](progress.md)。

## 语言策略

产出以中文为主:笔记、文档、README 用中文写,技术术语保留英文原文(如 event loop、microtask);代码中的变量名、函数名保持英文惯例,注释用中文。先保证理解透,英文产出留到求职冲刺阶段再补。

## 环境要求

- Node.js ≥ 24(原生支持 TypeScript type stripping,可直接 `node xxx.ts`)
- 或使用 tsx(已内置为 devDependency)

## 快速开始

```bash
npm install
npm run typecheck        # tsc --noEmit,日常验证

# 运行某个实验(以 Day 1 为例)
node src/01-event-loop/01-sync-nexttick-microtask.ts
# 或
npx tsx src/01-event-loop/01-sync-nexttick-microtask.ts
```

## 目录结构

```
365_SFS/
├── roadmap.md            # 365 天成长路线图(11 个 Phase)
├── progress.md           # 每日进度记录
├── notes/                # 每日学习笔记(中文)
│   ├── 01-event-loop.md
│   ├── 02-streams.md
│   └── 02-streams-教学.html # Day 2 图文教学版(生活例子 + 互动小实验)
└── src/
    ├── 01-event-loop/    # Day 1:Node.js event loop 深入(一个实验一个文件)
    │   ├── 01-sync-nexttick-microtask.ts  # 同步 vs nextTick vs microtask(ESM 顶层反序)
    │   ├── 02-timeout-vs-immediate.ts     # 顶层 setTimeout(0) vs setImmediate(不确定)
    │   ├── 03-io-callback.ts              # I/O callback 内的确定顺序(干净输出 1→7)
    │   ├── 04-timer-ready.ts              # 先注册再忙等:把不确定锁定为确定
    │   └── 05-blocking-vs-chunked.ts      # 阻塞 loop vs setImmediate 协作式分片
    └── 02-streams/       # Day 2:Buffer 与 Stream 深入(一个实验一个文件)
        ├── exp1-buffer-basics.ts       # 字节 vs 字符、编码、alloc/from/concat
        ├── exp2-backpressure.ts        # 手写背压:pause/resume + drain 对照实验
        └── exp3-transform-pipeline.ts  # Transform + pipeline 流式处理 ~74MB 日志
```

## 进度速览

- **Day 1(2026-08-10)**:Node.js 事件循环深入 + TS 项目骨架 —— 5 个实验 + [中文笔记](notes/01-event-loop.md) ✅
- **Day 2(2026-08-11)**:Buffer 与 Stream 深入 —— 3 个实验(Buffer 基础 / 手写背压 / pipeline 大文件处理)+ [中文笔记](notes/02-streams.md) + [图文教学 HTML](notes/02-streams-教学.html) ✅
