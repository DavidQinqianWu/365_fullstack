# 365 天高级全栈工程师成长路线图

> 学员背景:7 年前端经验,目标成为高级全栈工程师,应聘全球市场(重点:德国/瑞士)。
> 技术主线:**全 TypeScript 栈**(Next.js + Node.js/NestJS)+ PostgreSQL + 云部署 + 系统设计 + AI Engineering。
> 原则:每天进步一点点,每天都有 GitHub 可见的产出(commit / PR / issue / 文档)。

## 目标市场技术栈参考(德国/瑞士招聘高频 · TS 方向)

- 前端/全栈:React、Next.js(App Router、RSC)、TypeScript 高级类型
- 后端:Node.js、NestJS、GraphQL/tRPC、WebSocket
- 数据:PostgreSQL、Redis、消息队列(Kafka/RabbitMQ)、向量数据库(pgvector/Qdrant)
- DevOps:Docker、Kubernetes、CI/CD(GitHub Actions)、AWS 为主
- AI Engineering:LLM API、RAG、Agent、Vercel AI SDK / LangChain.js(欧洲市场 2025+ 高增长方向)

---

## Phase 1(Day 1–30):后端基础 — Node.js/TypeScript + NestJS

- Week 1:Node.js 运行时深入(事件循环、流、Buffer、进程模型、worker_threads),用 TS 搭建项目骨架
- Week 2:TypeScript 高级类型在后端的应用(泛型、条件类型、类型安全的环境变量/DI)
- Week 3:NestJS 核心(模块、依赖注入、控制器、管道、守卫、拦截器、异常过滤)
- Week 4:REST API 设计规范(版本化、分页、错误格式、OpenAPI/Swagger)+ 实战:完整 REST API(任务管理服务)
- GitHub 产出:每天提交代码或英文笔记;Week 4 项目独立仓库,英文 README

## Phase 2(Day 31–60):数据层 — PostgreSQL / Redis / ORM

- Week 5:SQL 深入(JOIN、窗口函数、索引、EXPLAIN 执行计划、事务与隔离级别)
- Week 6:Prisma(或 Drizzle):schema 设计、迁移、关系建模、N+1 问题
- Week 7:Redis(缓存策略、穿透/雪崩、分布式锁、会话存储、rate limiting)
- Week 8:实战 — 给 Phase 1 的 API 加上 PostgreSQL + Redis 缓存层,写性能对比笔记(英文)
- GitHub 产出:迁移脚本、索引优化前后 EXPLAIN 对比 markdown

## Phase 3(Day 61–90):工程化 — 认证、测试、API 质量

- Week 9:认证授权(JWT、Refresh Token、OAuth2/OIDC、RBAC 权限模型)
- Week 10:测试体系(Vitest/Jest 单元、supertest 集成、Playwright E2E、测试金字塔、覆盖率门禁)
- Week 11:API 安全与质量(限流、CORS、Helmet、输入校验 zod、OWASP Top 10)
- Week 12:实战 — 完整认证模块 + 测试覆盖率 ≥80%,英文 SECURITY.md
- GitHub 产出:测试 PR、安全 checklist 文档

## Phase 4(Day 91–120):DevOps — Docker / CI/CD / 云部署

- Week 13:Docker(镜像分层、多阶段构建、docker-compose 编排全栈环境)
- Week 14:GitHub Actions(测试/构建/部署流水线、缓存、矩阵构建、密钥管理)
- Week 15:云部署(AWS EC2/ECS 或 Fly.io/Render,域名、HTTPS、环境变量管理)
- Week 16:可观测性(结构化日志 pino、健康检查、Prometheus + Grafana 入门、OpenTelemetry 初探)
- GitHub 产出:workflow 文件、Dockerfile、英文部署文档

## Phase 5(Day 121–150):现代 TS 全栈深化 — Next.js / tRPC / GraphQL / 实时

- Week 17:Next.js App Router 深入(RSC、Server Actions、缓存策略、Streaming SSR)——以全栈视角重学前端框架
- Week 18:tRPC 端到端类型安全(或 GraphQL + Pothos/codegen),对比 REST 写英文复盘
- Week 19:实时系统(WebSocket、SSE、乐观更新、presence/协作基础)
- Week 20:实战 — 给已有项目加实时通知模块 + tRPC/GraphQL 层
- GitHub 产出:实时模块代码、三种 API 范式对比文章(英文 markdown)

## Phase 6(Day 151–185):系统设计基础

- Week 21:扩展性(负载均衡、水平/垂直扩展、无状态设计、CDN)
- Week 22:数据架构(分库分表、读写分离、缓存架构、CQRS 入门)
- Week 23:异步架构(消息队列 Kafka/RabbitMQ、事件驱动、幂等性、outbox 模式)
- Week 24:经典系统设计题 I(URL shortener、限流器、feed 系统)—— 每题画架构图 + 英文设计稿
- Week 25:实战 — 在现有项目中引入消息队列,实现异步任务(邮件/报表)
- GitHub 产出:`system-design/` 目录,每题一个英文 markdown + mermaid 架构图

## Phase 7(Day 186–230):全栈 Capstone 项目 1

- 题目建议:多租户 SaaS(如团队协作/招聘平台 clone,贴合欧洲市场业务)
- 要求:Next.js + NestJS + PostgreSQL + Redis + Docker + CI/CD + 云部署 + 完整测试
- 全程英文 README、commit message、issue/PR;每 2 周一个可演示里程碑,写英文 dev log
- GitHub 产出:主仓库持续提交,部署链接挂在 README

## Phase 8(Day 231–270):全栈 Capstone 项目 2 + 开源贡献

- Week 31–35:第二个项目(建议含实时特性:协作编辑/通知/白板,用上 Phase 5 的 WebSocket 能力)
- Week 36–38:开源贡献 — 给 NestJS/Prisma/Next.js/tRPC 等仓库提 PR(从 good first issue 开始)
- GitHub 产出:开源 PR 记录、项目 2 仓库

## Phase 9(Day 271–305):高级系统设计

- Week 39:分布式基础(CAP、一致性模型、分布式锁、leader election 直觉)
- Week 40:可靠性设计(重试、熔断、降级、超时预算、saga 分布式事务)
- Week 41:经典系统设计题 II(设计 Uber/订票系统/分布式 KV/指标监控系统)—— 英文设计稿 + 容量估算
- Week 42:复盘重构 — 把 Phase 6 的设计题按新认知重写一遍,对比前后版本
- GitHub 产出:高级设计文档、前后版本对比笔记

## Phase 10(Day 306–340):AI Engineering 基础(TS 栈)

- Week 43:LLM 应用基础(OpenAI/Anthropic API、prompt 工程、structured output、function/tool calling)
- Week 44:RAG 实战(embedding、chunking 策略、pgvector/Qdrant、检索评估)—— 用 TS 实现完整 RAG pipeline
- Week 45:Agent 与工具链(Vercel AI SDK 或 LangChain.js、多步工具调用、Human-in-the-loop、流式 UI)
- Week 46:生产化(LLM 可观测性、成本/延迟优化、评估 evals、guardrails)
- GitHub 产出:`ai-lab/` 仓库:RAG demo、agent demo、英文实验笔记

## Phase 11(Day 341–365):AI 全栈 Capstone + 系统设计综合复盘

- Week 47–49:AI 全栈项目 — 把 LLM 能力做进一个完整产品(如 AI 知识库问答 SaaS:Next.js + NestJS + pgvector + RAG + 流式响应 + 订阅计费),全程沿用 Capstone 1 的工程标准
- Week 50:系统设计综合周 — 每天一题,把 AI 系统纳入设计(如"设计一个支持 RAG 的企业搜索")
- Week 51–52:全年复盘 — 整理 GitHub 成果墙、重构最有价值的两个仓库 README、写一篇英文年终技术总结
- GitHub 产出:AI capstone 仓库、英文年度总结博客(可放 GitHub Pages)

---

## 每日任务执行规则(给每日 Agent)

1. 先读取 `progress.md`,确定今天是第几天、当前处于哪个 Phase/Week。
2. 给出当天具体任务:学习目标(工作日 1 小时内可完成的核心任务 + 可选加深任务;周末可到 2 小时)。
3. 每个任务必须包含一个 **GitHub 可见产出**:代码 commit、笔记 markdown、issue、PR、架构图均可。
4. 给出具体的 git 操作指引(若本地有 git/gh 环境且用户已配置,可直接协助提交;否则给出可复制命令)。
5. 任务语言:中文讲解,但所有产出物(commit message、README、文档)要求英文,模拟真实海外工作环境。
6. 在 `progress.md` 追加当天记录:日期、Day N、任务、产出、状态。
