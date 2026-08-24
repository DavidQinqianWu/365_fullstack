# 365 天高级全栈工程师成长路线图

> 学员背景:7 年前端经验,目标成为高级全栈工程师,应聘全球市场(重点:德国/瑞士)。
> 技术主线:**全 TypeScript 栈**(Next.js + Node.js/NestJS)+ PostgreSQL + 云部署 + 系统设计 + AI Engineering。
> **核心学习策略:概念先行,语言为器。** 后端部分以 Node.js/TypeScript 为「教具」,但学习目标是**语言无关的后端通用概念**——运行机制、并发模型、Web 框架解剖、数据库、缓存、消息队列、架构风格。就像学会 React 后拾 Vue 很快(组件、状态、生命周期是通用的),后端也一样:中间件管线、依赖注入、ORM、事务、限流这些概念在 .NET、Java、Go 里全都在,只是换了个名字。每个后端主题都要产出「概念卡 + 跨语言对照」,确保未来转 C#/.NET 或任何后端栈都能快速映射。
> 时间标准:**每天 1.5 小时**(约 50 min 学习 + 30 min 动手练习 + 10 min 产出整理)。
> 原则:每天进步一点点,每天都有 GitHub 可见的产出(commit / PR / issue / 文档)。
> 语言策略:**产出以中文为主**——笔记、文档、README、设计稿一律用中文写,技术术语保留英文原文(如 event loop、middleware、transaction),先保证理解透;变量名、函数名保持英文(行业惯例),代码注释也用中文写;英文版产出(README/总结/面试表达)只作为有余力时或求职冲刺阶段的可选加分项,不作每日要求。

## 目标市场技术栈参考(德国/瑞士招聘高频 · TS 方向)

- 前端/全栈:React、Next.js(App Router、RSC、Server Actions)、TypeScript 高级类型
- 后端:Node.js、NestJS、GraphQL/tRPC、WebSocket(**注意:欧洲市场 C#/.NET 与 Java 岗位同样极多,概念可迁移性是硬通货**)
- 数据:PostgreSQL、Redis、消息队列(Kafka/RabbitMQ)、向量数据库(pgvector/Qdrant)
- DevOps:Docker、Kubernetes、CI/CD(GitHub Actions)、AWS 为主
- AI Engineering:LLM API、RAG、Agent、Vercel AI SDK / LangChain.js(欧洲市场 2025+ 高增长方向)

---

## 后端概念跨语言对照表(全年持续补充 · 求职迁移用)

> 这就是后端世界的「Vue ↔ React 对照表」。每学一个概念,就在对应行补上你亲手验证过的理解。
> 目标:面试 C#/.NET 岗位时,能把每个 .NET 名词翻译回你已掌握的通用概念。

| 通用概念 | Node.js / TS 生态(你的教具) | C# / .NET | Java | Go |
|---|---|---|---|---|
| 运行时与并发模型 | event loop + libuv 线程池 + worker_threads | 线程池 + async/await (Task) | 线程池 / virtual threads (Loom) | goroutine + channel |
| Web 框架 | NestJS(企业级)/ Express(裸) | ASP.NET Core | Spring Boot | Gin / Echo |
| 请求管线 / 中间件 | Express middleware、NestJS interceptor/guard | Middleware pipeline + Filter | Filter / Interceptor (AOP) | middleware(handler 链) |
| 依赖注入(DI) | NestJS IoC 容器 | 内置 DI(Microsoft.Extensions.DI) | Spring IoC | 手动注入 / wire |
| ORM / 数据访问 | Prisma / Drizzle | EF Core(LINQ) | Hibernate / JPA | GORM / sqlx |
| DB 迁移 | Prisma Migrate | EF Core Migrations | Flyway / Liquibase | goose / migrate |
| 输入校验 | zod / class-validator | DataAnnotations / FluentValidation | Bean Validation | validator |
| 配置与环境 | dotenv + 类型安全 env | appsettings.json + Options 模式 | application.yml + @ConfigurationProperties | env / viper |
| 结构化日志 | pino / winston | Serilog / ILogger | SLF4J + Logback | slog / zap |
| 测试 | Vitest / Jest / supertest | xUnit + WebApplicationFactory | JUnit + MockMvc | testing + httptest |
| API 文档 | OpenAPI/Swagger(语言无关标准) | Swashbuckle / Scalar | springdoc | swag |
| 后台任务 / 定时 | BullMQ / node-cron | Hangfire / BackgroundService | Quartz / @Scheduled | cron / asynq |
| 缓存客户端 | ioredis | StackExchange.Redis | Lettuce / Redisson | go-redis |
| 消息队列 | amqplib / kafkajs | MassTransit / NServiceBus | Spring AMQP / Kafka | sarama / amqp |

学习要求:每周后端任务产出的笔记中,**必须有「概念卡」**(这个概念的通用定义,不绑定任何语言)+ 在上述表格对应行补充一句话心得。

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

## Phase 1(Day 1–30):后端运行机制 — 服务端是怎么跑起来的

> 本阶段主题:任何后端语言都绕不开的底层机制——**运行时、并发模型、HTTP 协议、Web 框架解剖**。Node.js 只是第一个观察样本,每周都要回答一个问题:「这个机制在 .NET / Java / Go 里长什么样?」

- Week 1:运行时与并发模型 I(以 Node.js 为例):event loop、流、Buffer、进程模型、worker_threads;**概念卡:单线程事件循环 vs 多线程线程池(.NET/Java)vs 轻量协程(Go),三种并发模型的取舍**
- Week 2:类型系统与并发模型 II:TypeScript 高级类型在服务端的应用(泛型、条件类型、类型安全的环境变量/DI);**概念卡:静态类型对服务端工程的价值——C#/Java 天然静态类型,TS 是你在 JS 世界提前适应静态类型思维的桥梁**
- Week 3:Web 框架通用解剖(以 NestJS 为例):**请求管线(中间件 → 守卫 → 拦截器 → 管道)、依赖注入、路由、异常过滤**——这些概念逐一标注 ASP.NET Core(middleware/filter/内置 DI)与 Spring(AOP/IoC)的对应物,而不是背 NestJS 的 API
- Week 4:API 设计(语言无关):**HTTP 语义深入(方法、状态码、幂等性、内容协商)、REST 约束、版本化、分页、统一错误格式(RFC 7807 problem+json)、OpenAPI 规范**;实战:完整 REST API(任务管理服务),用 NestJS 实现,但设计文档按语言无关的方式写
- GitHub 产出:每天提交代码或中文笔记;Week 4 项目独立仓库,中文 README;**每周一张概念卡 + 对照表更新**

## Phase 2(Day 31–60):数据层 — 数据库是后端的心脏

> 本阶段是整个路线图中**语言无关度最高**的部分:SQL、事务、索引、缓存模式在任何技术栈里一字不差。ORM 则是最体现「同概念不同实现」的典型(Prisma ≈ EF Core ≈ Hibernate)。

- Week 5:关系型数据库核心(**纯概念,与语言零绑定**):关系模型、SQL 深入(JOIN、窗口函数)、索引原理(B-tree、复合索引最左前缀)、EXPLAIN 执行计划、**事务 ACID 与四种隔离级别(脏读/不可重复读/幻读实验)**、连接池概念
- Week 6:ORM 与数据访问模式(**重点学模式,不是学 Prisma**):ActiveRecord vs DataMapper、Unit of Work、Repository 模式争议、N+1 问题;用 Prisma(或 Drizzle)实现,对照 EF Core 的 LINQ + DbContext 写法写一页对照笔记
- Week 7:Redis 与缓存通用模式(**概念 #2 Caching**:Cache Aside / Read-Through / Write-Behind、穿透/雪崩/击穿、分布式锁、会话存储)——模式全部语言无关,ioredis 只是客户端之一
- Week 8:实战 — 给 Phase 1 的 API 加上 PostgreSQL + Redis 缓存层,写性能对比笔记;预热**概念 #4**:本地起主从两个 PG 实例观察复制;**可选加深:NoSQL 全景认知一页纸(文档型 MongoDB / KV / 宽列 Cassandra / 图),各自解决什么问题**
- GitHub 产出:迁移脚本、索引优化前后 EXPLAIN 对比 markdown、cache-aside 实现代码、事务隔离级别实验记录

## Phase 3(Day 61–90):工程化 — 认证、测试、架构风格 I

- Week 9:认证授权(**协议层,语言无关**):JWT 结构与签名验证原理、Refresh Token 轮换、OAuth2/OIDC 流程(授权码模式 + PKCE)、RBAC vs ABAC 权限模型——实现用 NestJS,但产出物是协议时序图
- Week 10:测试体系(测试金字塔是通用方法论):单元/集成/E2E 的边界划分、测试替身(mock/stub/fake)、覆盖率门禁;工具用 Vitest/Jest + supertest + Playwright,对照 xUnit + WebApplicationFactory 的等价物
- Week 11:API 安全与质量(**概念 #7 Rate Limiting**:用 Redis 手写令牌桶 + 滑动窗口限流器、CORS 原理、输入校验、OWASP Top 10)——全部是协议与模式层面的知识
- Week 12:**架构风格 I(代码级架构,新增重点)+ 实战**:分层架构 → 六边形架构(Hexagonal / Ports & Adapters)→ Clean Architecture 的演进逻辑;**DDD 战术模式入门**(实体、值对象、聚合根、仓储);实战:用六边形架构重构任务服务并落地完整认证模块,测试覆盖率 ≥80%,附中文 SECURITY.md;**对照:微软官方 Clean Architecture 模板(eShop 参考应用)的目录结构**
- GitHub 产出:测试 PR、限流器代码、架构重构前后对比笔记(为什么端口-适配器模式让你换数据库/换框架时业务代码不动)

## Phase 4(Day 91–120):DevOps — Docker / CI/CD / 云部署

> 本阶段天然语言无关:Docker、K8s、CI/CD 不关心你容器里跑的是 Node 还是 .NET。

- Week 13:Docker(镜像分层、多阶段构建、docker-compose 编排全栈环境)
- Week 14:GitHub Actions(测试/构建/部署流水线、缓存、矩阵构建、密钥管理)
- Week 15:云部署(AWS EC2/ECS 或 Fly.io/Render,域名、HTTPS、环境变量管理)+ Kubernetes 入门(minikube/k3s:Deployment、Service、滚动更新)
- Week 16:**概念 #9 + #10**:健康检查(liveness/readiness probe)+ 可观测性(**结构化日志、Metrics、Traces 三大支柱是语言无关的**,OpenTelemetry 本身就是跨语言标准;Node 侧用 pino + Prometheus + Grafana)
- GitHub 产出:workflow 文件、Dockerfile、K8s manifest、中文部署文档

## Phase 5(Day 121–150):现代 TS 全栈深化 — Next.js / tRPC / GraphQL / 实时

- Week 17:Next.js App Router 深入(RSC、Server Actions、缓存策略、Streaming SSR)——以全栈视角重学前端框架
- Week 18:API 范式横向对比(**概念卡:REST vs GraphQL vs RPC(tRPC/gRPC)各自的适用场景**——gRPC 在 .NET/Java 微服务里极高频):tRPC 端到端类型安全(或 GraphQL + Pothos/codegen),对比 REST 写中文复盘
- Week 19:实时通信协议(语言无关):长轮询 vs SSE vs WebSocket vs WebRTC 的原理与取舍、乐观更新、presence/协作基础;Node 侧用 ws 实现,标注 SignalR(.NET)的等价能力
- Week 20:实战 — 给已有项目加实时通知模块 + tRPC/GraphQL 层
- GitHub 产出:实时模块代码、三种 API 范式对比文章(中文 markdown)

## Phase 6(Day 151–185):系统设计基础(10 大概念集中攻坚)

- Week 21:**概念 #1 Load Balancer + #3 CDN**(L4/L7、轮询/最少连接、Nginx/HAProxy 本地实验、CDN 缓存命中与失效)
- Week 22:**概念 #4 Database Replication + #5 Sharding**(主从复制、读写分离、故障切换直觉;分片键选择、一致性哈希、跨分片查询)
- Week 23:**概念 #6 Message Queues**(Kafka/RabbitMQ、事件驱动架构、**幂等性、at-least-once vs exactly-once、outbox 模式**——这些语义在任何 MQ 客户端里都一样)
- Week 24:经典系统设计题 I(URL shortener、限流器、feed 系统)—— 每题画架构图 + 中文设计稿,强制用上已学概念
- Week 25:实战 — 在现有项目中引入消息队列,实现异步任务(邮件/报表);**对照:.NET 的 Hangfire/MassTransit、Java 的 Quartz 解决同类问题**
- GitHub 产出:`system-design/` 目录,每题一个中文 markdown + mermaid 架构图;10 个概念各一页中文 cheat sheet

## Phase 7(Day 186–230):全栈 Capstone 项目 1

- 题目建议:多租户 SaaS(如团队协作/招聘平台 clone,贴合欧洲市场业务)
- 要求:Next.js + NestJS + PostgreSQL + Redis + Docker + CI/CD + 云部署 + 完整测试;必须用到至少 5 个 10 大概念(缓存、限流、健康检查、可观测性、消息队列);**代码组织必须按 Week 12 学的六边形架构,并在 README 里写清「如果明天换成 ASP.NET Core,哪些层可以原样保留思路」**
- 文档语言:中文 README、commit message、issue/PR;每 2 周一个可演示里程碑,写中文 dev log
- GitHub 产出:主仓库持续提交,部署链接挂在 README

## Phase 8(Day 231–270):全栈 Capstone 项目 2 + 开源贡献

- Week 31–35:第二个项目(建议含实时特性:协作编辑/通知/白板,用上 Phase 5 的 WebSocket 能力)
- Week 36–38:开源贡献 — 给 NestJS/Prisma/Next.js/tRPC 等仓库提 PR(从 good first issue 开始;开源 PR 的标题与描述按目标仓库惯例用英文,这是极少数必须用英文的场景)
- **可选支线(有余力时):用 C#/.NET 把一个已有小项目(如 Week 4 的任务管理 API)重写一遍**——这是对全年「概念可迁移性」学习策略的终极检验,也是对标欧洲 .NET 岗位的直接作品
- GitHub 产出:开源 PR 记录、项目 2 仓库

## Phase 9(Day 271–305):高级系统设计 + 架构风格 II

- Week 39:**架构风格 II(系统级架构)+ 分布式基础**:模块化单体 vs 微服务的取舍(什么时候不该拆)、服务发现、API Gateway、CAP、一致性模型、分布式锁、leader election 直觉
- Week 40:**概念 #8 Circuit Breaker** + 可靠性设计(重试、熔断、降级、超时预算、saga 分布式事务;手写一个熔断器实现)——对照 .NET 生态的 Polly 库,你会发现设计一模一样
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
- Week 51–52:全年复盘 — 整理 GitHub 成果墙、重构最有价值的两个仓库 README、**把填满的「后端概念跨语言对照表」整理成一篇独立的可迁移性总结(求职 .NET/Java 岗位时的秘密武器)**、写一篇中文年终技术总结(此时如有余力,可把核心 README 和总结翻成英文,直接进入求职冲刺)
- GitHub 产出:AI capstone 仓库、中文年度总结博客(可放 GitHub Pages)

---

## 每日任务执行规则(给每日 Agent)

1. 先读取 `progress.md`,确定今天是第几天、当前处于哪个 Phase/Week。
2. 给出当天具体任务:**按每天 1.5 小时设计**(学习 + 习题合计约 90 min)。
3. **当天任务必须汇总为一个 HTML 学习文档**:
   - 文件名为 `Day N - 学习主题.html`,放在 `docs/` 下以 `01-event-loop`、`02-streams` 这种编号-主题风格命名的文件夹中(一天一个文件夹);
   - HTML 文档必须有**目录、章节图标、结尾总结**,能清晰地学习知识、定位知识、复习知识;
   - 讲解语言**通俗易懂,把学员当成 10 岁新手程序员**,多用生活中的例子打比方(餐厅、快递、红绿灯等);
   - 该 HTML 本身就是当天的 GitHub 可见产出。
4. **每天的习题代码写入 `src/` 文件夹**(按天建子目录,如 `src/01-event-loop/`)。
5. 给出具体的 git 操作指引(若本地有 git/gh 环境且用户已配置,可直接协助提交;否则给出可复制命令)。
6. 任务与产出语言:**全程中文**,语气简洁、教练式,不寒暄;技术术语保留英文原文(如 event loop、middleware、transaction);代码中的变量名、函数名维持英文惯例,注释用中文写。
7. **概念先行,语言为器**:讲解时先讲语言无关的通用概念,再用 Node.js 作为练习语言举例;确保所学概念换成 C#/.NET、Java、Go 同样成立。产出笔记必须包含「概念卡」(通用定义)和「跨语言对照」(该概念在 .NET / Java / Go 里的对应物),并持续更新 roadmap 顶部的对照表。
8. 在 `progress.md` 的表格中追加当天一行:日期、Day N、Phase/Week、任务摘要、GitHub 产出、状态(待完成/已完成)。
9. 涉及 10 大 System Design 概念的周次,任务中必须显式标注对应概念编号(如「概念 #2 Caching」),并要求产出 cheat sheet 或最小实现。
