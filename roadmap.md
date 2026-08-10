# 365 天高级全栈工程师成长路线图

> 学员背景:7 年前端经验,目标成为高级全栈工程师,应聘全球市场(重点:德国/瑞士)。
> 技术主线:**全 TypeScript 栈**(Next.js + Node.js/NestJS)+ PostgreSQL + 云部署 + 系统设计 + AI Engineering。
> 时间标准:**每天 2 小时**(约 60 min 学习 + 45 min 动手练习 + 15 min 产出整理与提交)。
> 原则:每天进步一点点,每天都有 GitHub 可见的产出(commit / PR / issue / 文档)。
> 语言策略:**产出以中文为主**——笔记、文档、README、设计稿一律用中文写,技术术语保留英文原文(如 event loop、microtask),先保证理解透;变量名、函数名保持英文(行业惯例),代码注释也用中文写;英文版产出(README/总结/面试表达)只作为有余力时或求职冲刺阶段的可选加分项,不作每日要求。

## 目标市场技术栈参考(德国/瑞士招聘高频 · TS 方向)

- 前端/全栈:React、Next.js(App Router、RSC、Server Actions)、TypeScript 高级类型
- 后端:Node.js、NestJS、GraphQL/tRPC、WebSocket
- 数据:PostgreSQL、Redis、消息队列(Kafka/RabbitMQ)、向量数据库(pgvector/Qdrant)
- DevOps:Docker、Kubernetes、CI/CD(GitHub Actions)、AWS 为主
- AI Engineering:LLM API、RAG、Agent、Vercel AI SDK / LangChain.js(欧洲市场 2025+ 高增长方向)

---

## 必懂的 10 个 System Design 核心概念(全年主线,显式嵌入各周)

| # | 概念 | 关键词 | 落点 |
|---|---|---|---|
| 1 | Load Balancer | 流量分发、L4/L7、健康路由 | Week 21 |
| 2 | Caching | Redis + Cache Aside、穿透/雪崩 | Week 7 |
| 3 | CDN | 内容分发加速、边缘缓存 | Week 21 |
| 4 | Database Replication | 主从复制、读写分离、高可用 | Week 22(Week 8 实战预热) |
| 5 | Sharding | 水平扩展、分片键、再平衡 | Week 22 |
| 6 | Message Queues | Kafka / RabbitMQ、异步解耦 | Week 23 |
| 7 | Rate Limiting | 令牌桶/滑动窗口、接口保护 | Week 11(Redis 实现) |
| 8 | Circuit Breaker | 故障隔离、熔断/降级 | Week 40 |
| 9 | Health Checks | 服务探活、liveness/readiness | Week 16 |
| 10 | Observability | Logs + Metrics + Traces | Week 16(Week 46 进阶到 LLM) |

学习要求:每个概念都要「能画图 + 能手写最小实现或配置 + 能用中文 5 句话讲清楚」。(面试需要的英文版表达,留到求职冲刺阶段统一补,不占用日常学习时间。)

---

## Phase 1(Day 1–30):后端基础 — Node.js/TypeScript + NestJS

- Week 1:Node.js 运行时深入(事件循环、流、Buffer、进程模型、worker_threads),用 TS 搭建项目骨架
- Week 2:TypeScript 高级类型在后端的应用(泛型、条件类型、类型体操练习、类型安全的环境变量/DI)
- Week 3:NestJS 核心(模块、依赖注入、控制器、管道、守卫、拦截器、异常过滤)
- Week 4:REST API 设计规范(版本化、分页、错误格式、OpenAPI/Swagger)+ 实战:完整 REST API(任务管理服务)
- GitHub 产出:每天提交代码或中文笔记;Week 4 项目独立仓库,中文 README

## Phase 2(Day 31–60):数据层 — PostgreSQL / Redis / ORM

- Week 5:SQL 深入(JOIN、窗口函数、索引、EXPLAIN 执行计划、事务与隔离级别)
- Week 6:Prisma(或 Drizzle):schema 设计、迁移、关系建模、N+1 问题
- Week 7:Redis(**概念 #2 Caching**:Cache Aside 模式手写实现、穿透/雪崩/击穿、分布式锁、会话存储)
- Week 8:实战 — 给 Phase 1 的 API 加上 PostgreSQL + Redis 缓存层,写性能对比笔记;预热**概念 #4**:本地起主从两个 PG 实例观察复制
- GitHub 产出:迁移脚本、索引优化前后 EXPLAIN 对比 markdown、cache-aside 实现代码

## Phase 3(Day 61–90):工程化 — 认证、测试、API 质量

- Week 9:认证授权(JWT、Refresh Token、OAuth2/OIDC、RBAC 权限模型)
- Week 10:测试体系(Vitest/Jest 单元、supertest 集成、Playwright E2E、测试金字塔、覆盖率门禁)
- Week 11:API 安全与质量(**概念 #7 Rate Limiting**:用 Redis 手写令牌桶 + 滑动窗口限流器、CORS、Helmet、输入校验 zod、OWASP Top 10)
- Week 12:实战 — 完整认证模块 + 测试覆盖率 ≥80%,附中文 SECURITY.md
- GitHub 产出:测试 PR、限流器代码、安全 checklist 文档

## Phase 4(Day 91–120):DevOps — Docker / CI/CD / 云部署

- Week 13:Docker(镜像分层、多阶段构建、docker-compose 编排全栈环境)
- Week 14:GitHub Actions(测试/构建/部署流水线、缓存、矩阵构建、密钥管理)
- Week 15:云部署(AWS EC2/ECS 或 Fly.io/Render,域名、HTTPS、环境变量管理)+ Kubernetes 入门(minikube/k3s:Deployment、Service、滚动更新)
- Week 16:**概念 #9 + #10**:健康检查(liveness/readiness probe)+ 可观测性(结构化日志 pino、Prometheus + Grafana 指标、OpenTelemetry traces 入门)
- GitHub 产出:workflow 文件、Dockerfile、K8s manifest、中文部署文档

## Phase 5(Day 121–150):现代 TS 全栈深化 — Next.js / tRPC / GraphQL / 实时

- Week 17:Next.js App Router 深入(RSC、Server Actions、缓存策略、Streaming SSR)——以全栈视角重学前端框架
- Week 18:tRPC 端到端类型安全(或 GraphQL + Pothos/codegen),对比 REST 写中文复盘
- Week 19:实时系统(WebSocket、SSE、乐观更新、presence/协作基础)
- Week 20:实战 — 给已有项目加实时通知模块 + tRPC/GraphQL 层
- GitHub 产出:实时模块代码、三种 API 范式对比文章(中文 markdown)

## Phase 6(Day 151–185):系统设计基础(10 大概念集中攻坚)

- Week 21:**概念 #1 Load Balancer + #3 CDN**(L4/L7、轮询/最少连接、Nginx/HAProxy 本地实验、CDN 缓存命中与失效)
- Week 22:**概念 #4 Database Replication + #5 Sharding**(主从复制、读写分离、故障切换直觉;分片键选择、一致性哈希、跨分片查询)
- Week 23:**概念 #6 Message Queues**(Kafka/RabbitMQ、事件驱动、幂等性、outbox 模式)
- Week 24:经典系统设计题 I(URL shortener、限流器、feed 系统)—— 每题画架构图 + 中文设计稿,强制用上已学概念
- Week 25:实战 — 在现有项目中引入消息队列,实现异步任务(邮件/报表)
- GitHub 产出:`system-design/` 目录,每题一个中文 markdown + mermaid 架构图;10 个概念各一页中文 cheat sheet

## Phase 7(Day 186–230):全栈 Capstone 项目 1

- 题目建议:多租户 SaaS(如团队协作/招聘平台 clone,贴合欧洲市场业务)
- 要求:Next.js + NestJS + PostgreSQL + Redis + Docker + CI/CD + 云部署 + 完整测试;必须用到至少 5 个 10 大概念(缓存、限流、健康检查、可观测性、消息队列)
- 文档语言:中文 README、commit message、issue/PR;每 2 周一个可演示里程碑,写中文 dev log
- GitHub 产出:主仓库持续提交,部署链接挂在 README

## Phase 8(Day 231–270):全栈 Capstone 项目 2 + 开源贡献

- Week 31–35:第二个项目(建议含实时特性:协作编辑/通知/白板,用上 Phase 5 的 WebSocket 能力)
- Week 36–38:开源贡献 — 给 NestJS/Prisma/Next.js/tRPC 等仓库提 PR(从 good first issue 开始;开源 PR 的标题与描述按目标仓库惯例用英文,这是极少数必须用英文的场景)
- GitHub 产出:开源 PR 记录、项目 2 仓库

## Phase 9(Day 271–305):高级系统设计

- Week 39:分布式基础(CAP、一致性模型、分布式锁、leader election 直觉)
- Week 40:**概念 #8 Circuit Breaker** + 可靠性设计(重试、熔断、降级、超时预算、saga 分布式事务;手写一个熔断器实现)
- Week 41:经典系统设计题 II(设计 Uber/订票系统/分布式 KV/指标监控系统)—— 中文设计稿 + 容量估算
- Week 42:复盘重构 — 把 Phase 6 的设计题按新认知重写一遍,对比前后版本
- GitHub 产出:高级设计文档、熔断器代码、前后版本对比笔记

## Phase 10(Day 306–340):AI Engineering 基础(TS 栈)

- Week 43:LLM 应用基础(OpenAI/Anthropic API、prompt 工程、structured output、function/tool calling)
- Week 44:RAG 实战(embedding、chunking 策略、pgvector/Qdrant、检索评估)—— 用 TS 实现完整 RAG pipeline
- Week 45:Agent 与工具链(Vercel AI SDK 或 LangChain.js、多步工具调用、Human-in-the-loop、流式 UI)
- Week 46:生产化(**概念 #10 进阶**:LLM 可观测性 Langfuse/OpenTelemetry、成本/延迟优化、评估 evals、guardrails)
- GitHub 产出:`ai-lab/` 仓库:RAG demo、agent demo、中文实验笔记

## Phase 11(Day 341–365):AI 全栈 Capstone + 系统设计综合复盘

- Week 47–49:AI 全栈项目 — 把 LLM 能力做进一个完整产品(如 AI 知识库问答 SaaS:Next.js + NestJS + pgvector + RAG + 流式响应 + 订阅计费),全程沿用 Capstone 1 的工程标准
- Week 50:系统设计综合周 — 每天一题,把 AI 系统纳入设计(如"设计一个支持 RAG 的企业搜索"),逐题自查 10 大概念覆盖度
- Week 51–52:全年复盘 — 整理 GitHub 成果墙、重构最有价值的两个仓库 README、写一篇中文年终技术总结(此时如有余力,可把核心 README 和总结翻成英文,直接进入求职冲刺)
- GitHub 产出:AI capstone 仓库、中文年度总结博客(可放 GitHub Pages)

---

## 每日任务执行规则(给每日 Agent)

1. 先读取 `progress.md`,确定今天是第几天、当前处于哪个 Phase/Week。
2. 给出当天具体任务:**按每天 2 小时设计**(核心任务 ≈ 90 min:学习 + 动手练习;产出整理 ≈ 30 min;另附可选加深任务给有余力时)。
3. 每个任务必须包含一个 **GitHub 可见产出**:代码 commit、笔记 markdown、issue、PR、架构图均可。
4. 给出具体的 git 操作指引(若本地有 git/gh 环境且用户已配置,可直接协助提交;否则给出可复制命令)。
5. 任务与产出语言:**全程中文**。讲解用中文;笔记、README、文档、cheat sheet 等产出物也用中文,技术术语保留英文原文(如 event loop、microtask、sharding),以"看懂、讲清"为第一标准;代码中的变量名、函数名维持英文惯例,注释用中文写。英文版产出仅在用户有余力或进入求职冲刺阶段时作为可选加分项,不主动要求。
6. 在 `progress.md` 追加当天记录:日期、Day N、任务、产出、状态。
7. 涉及 10 大 System Design 概念的周次,任务中必须显式标注对应概念编号(如「概念 #2 Caching」),并要求产出 cheat sheet 或最小实现。
