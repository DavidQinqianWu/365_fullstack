# 365 天全栈工程师成长路线图(v2 · 后端为主)

> 学员背景:7 年前端经验,但 Day 4 水平测试 1/46 分——**后端、数据库、DevOps、系统设计从零起步,React/TS 深层知识也有真实缺口**。
> 目标:12 个月后拿到德国 **mid-level full-stack(后端偏重)** 岗位的面试与 offer。Senior 靠进岗后的工作年限积累,不在本路线图承诺范围内。
> 比重:后端 50% · DevOps 20% · 前端(React 栈)15% · 系统设计/代码设计 15%。
> 技术栈:TypeScript 全栈(Node.js + NestJS + React/Next.js)+ PostgreSQL + Redis + Docker + **Hetzner(主)** + AWS(第 10 个月补 3 周)。
> **核心策略:概念先行,语言为器。** 每个后端概念都要能换成 C#/Java/Python/Go 讲一遍。跨语言对照表是速查表,不是作业。
> 时间标准:**每天 3 小时**(50 min 学 + 100 min 做 + 30 min 写)。保底日 90 min,只做「做」的部分。
> 计数规则:只按 Day N 计数,不写日期。完成一天才算一天。
> 节奏:每 7 天的第 7 天是**复盘日**——不学新内容,只做默写、概念卡、对照表、code review。
> 语言策略:产出以中文为主,技术术语保留英文;代码标识符英文,注释中文。英/德版本由 Phase 9 的 AI 翻译 pipeline 生成,后期人工校对。
> **贯穿全年的项目:365 平台(www.supergood-tech.de)**——中英德三语博客 + 学习计划平台,标题《AI 时代:从前端到全栈》,副标题「帮助前端程序员一步一步成长为全栈程序员」。Phase 1–4 做它的后端 API(用户 / 每日任务 / 打卡),Phase 3 静态上线,Phase 5 用 Next.js 重建并三语上线,Phase 7 做完整平台,Phase 9–10 加 AI 翻译、问答与公开 beta。求职是持续进行的事,不占路线图时间。

## 目标市场技术栈参考(德国 · TS 全栈方向)

- 前端:React、TypeScript、TanStack Query、Next.js(App Router)
- 后端:Node.js、NestJS、REST、GraphQL、WebSocket
- 数据:PostgreSQL、Redis、消息队列(RabbitMQ/BullMQ)
- DevOps:Linux、Docker、docker compose、GitHub Actions、Hetzner、AWS(EC2/RDS/S3/IAM);Kubernetes 只到概念层
- 加分:OpenTelemetry/Grafana、AI Engineering(RAG)、德语 B2(不在本路线图内,但对岗位数量影响最大)

---

## 后端概念跨语言对照表(全年持续补充 · 求职迁移用)

> 这就是后端世界的「Vue ↔ React 对照表」。每学一个概念,就在对应行补上你亲手验证过的理解。
> 目标:面试 C#/.NET 岗位时,能把每个 .NET 名词翻译回你已掌握的通用概念。

| 通用概念 | Node.js / TS 生态(你的教具) | C# / .NET | Java | Python | Go |
|---|---|---|---|---|---|
| 运行时与并发模型 | event loop + libuv 线程池 + worker_threads | 线程池 + async/await (Task) | 线程池 / virtual threads (Loom) | asyncio event loop + GIL(多进程绕开 CPU 限制) | goroutine + channel |
| Web 框架 | NestJS(企业级)/ Express(裸) | ASP.NET Core | Spring Boot | FastAPI(async)/ Django(全家桶)/ Flask | Gin / Echo |
| 请求管线 / 中间件 | Express middleware、NestJS interceptor/guard | Middleware pipeline + Filter | Filter / Interceptor (AOP) | ASGI middleware / Django middleware | middleware(handler 链) |
| 依赖注入(DI) | NestJS IoC 容器 | 内置 DI(Microsoft.Extensions.DI) | Spring IoC | FastAPI Depends()(函数式 DI)| 手动注入 / wire |
| ORM / 数据访问 | Prisma / Drizzle | EF Core(LINQ) | Hibernate / JPA | SQLAlchemy / Django ORM | GORM / sqlx |
| DB 迁移 | Prisma Migrate | EF Core Migrations | Flyway / Liquibase | Alembic / Django migrations | goose / migrate |
| 输入校验 | zod / class-validator | DataAnnotations / FluentValidation | Bean Validation | pydantic | validator |
| 配置与环境 | dotenv + 类型安全 env | appsettings.json + Options 模式 | application.yml + @ConfigurationProperties | pydantic-settings / django settings.py | env / viper |
| 结构化日志 | pino / winston | Serilog / ILogger | SLF4J + Logback | logging / structlog | slog / zap |
| 测试 | Vitest / Jest / supertest | xUnit + WebApplicationFactory | JUnit + MockMvc | pytest + httpx TestClient | testing + httptest |
| API 文档 | OpenAPI/Swagger(语言无关标准) | Swashbuckle / Scalar | springdoc | FastAPI 内置 OpenAPI / drf-spectacular | swag |
| 后台任务 / 定时 | BullMQ / node-cron | Hangfire / BackgroundService | Quartz / @Scheduled | Celery / APScheduler | cron / asynq |
| 缓存客户端 | ioredis | StackExchange.Redis | Lettuce / Redisson | redis-py | go-redis |
| 消息队列 | amqplib / kafkajs | MassTransit / NServiceBus | Spring AMQP / Kafka | Celery(broker)/ pika / aiokafka | sarama / amqp |
| 流式 I/O(Stream/Buffer/背压) | stream.Readable/Writable、Buffer、pipeline、write→drain 背压 | System.IO.Stream、byte[]/Span、CopyToAsync、await 隐式背压 | InputStream/OutputStream、ByteBuffer(NIO)、transferTo、Reactive Streams request(n) | file-like object、bytes/bytearray、shutil.copyfileobj、async generator(await 隐式背压)| io.Reader/io.Writer、[]byte、io.Copy、阻塞读写天然背压 |

使用方式:这张表是**对照速查表**,不是每周作业。学到某个概念时,顺手在对应行补一句你验证过的理解;没学到的行保持原样。目的:看一眼就知道这个概念在 C#/Java/Python/Go 里叫什么,面试或换栈时能快速上手。

---

## 必懂的 10 个 System Design 核心概念(全年主线)

| # | 概念 | 关键词 | 落点 |
|---|---|---|---|
| 1 | Load Balancer | 流量分发、L4/L7、算法 | Week 28 |
| 2 | Caching | Cache Aside、穿透/雪崩/击穿 | Week 10 |
| 3 | CDN | 边缘缓存、失效 | Week 28 |
| 4 | Database Replication | 主从、读写分离、故障切换 | Week 29 |
| 5 | Sharding | 分片键、一致性哈希 | Week 29 |
| 6 | Message Queues | at-least-once、幂等、outbox | Week 30 |
| 7 | Rate Limiting | 令牌桶、滑动窗口 | Week 18 |
| 8 | Circuit Breaker | 熔断/重试/超时/降级 | Week 44 |
| 9 | Health Checks | liveness/readiness、compose healthcheck | Week 14 |
| 10 | Observability | logs / metrics / traces | Week 15 入门,Week 31 深入 |

要求:每个概念都要「能画图 + 能手写最小实现或配置 + 能用中文 5 句话讲清楚」。

---

## 水平测试 → 路线图的映射

Day 4 做的 [水平测试](docs/00-level-check/level-check.md) 共 25 题。下表标出每题在哪一周被补上。**每个 Phase 结束时重答该 Phase 覆盖的题,必须每题 2/2 才进入下一 Phase。**

| 题号 | 主题 | 补上的周 |
|---|---|---|
| A1 A2 | HTTP 幂等、状态码、错误体 | Week 2 |
| A3 | CPU 密集接口 | Week 3 |
| A4 | JWT / 登出 | Week 16 |
| A5 | CORS | Week 18 |
| B1 | SQL 聚合 | Week 6 |
| B2 | 索引 / LIKE | Week 8 |
| B3 | 并发扣库存 | Week 8 |
| B4 | N+1 | Week 9 |
| B5 | Redis vs PG | Week 10 |
| C1 | GraphQL 取舍 | Week 25 |
| C2 | 分页 | Week 5 |
| D1 | Linux 命令 | Week 12 |
| D2 D3 | Dockerfile / compose | Week 13 |
| D4 | HTTPS | Week 14 |
| D5 | CI/CD | Week 15 |
| D6 | 何时不用 K8s | Week 15 |
| E1 | 拆分 createOrder | Week 19 |
| E2 | DI | Week 4 + Week 19 |
| E3 | 分层边界 | Week 20 |
| F1 F2 F3 | 系统设计 | Week 28 + Week 32 |
| G1 | useEffect 竞态 | Week 21 |
| G2 | discriminated union | Week 2 |
| H1 | 令牌桶 | Week 18 |

---

## Phase 1(Day 1–35):后端运行机制 + HTTP + Web 框架 + REST

> 主题:服务端是怎么跑起来的。Node.js 是观察样本,每周问一次:「这个机制在 .NET / Java / Python / Go 里长什么样?」

- **Week 1(Day 1–7)运行时与并发模型**:Day 1–4 已完成(并发模型、event loop、Stream/Buffer、进程模型)。Day 5:worker_threads 与「什么时候该用」。Day 6:用原生 `http` 模块裸写服务器——请求报文、响应报文、header、状态码。Day 7:复盘日。
- **Week 2(Day 8–14)服务端 TypeScript 补强 + HTTP 语义**:泛型、discriminated union 与类型收窄(G2)、unknown/never、zod 校验;HTTP 方法与幂等(A1)、状态码与统一错误格式 RFC 9457 problem+json(A2)、内容协商、缓存头。产出:原生 http 写一个 JSON API,带 zod 校验和统一错误体。
- **Week 3(Day 15–21)Express 解剖**:手写 middleware 链(`next()` 原理)、路由、错误处理中间件、async 错误陷阱;CPU 密集接口的两种解法——worker_threads 与任务队列(A3)。产出:365 API v1(内存存储)。
- **Week 4(Day 22–28)NestJS 与依赖注入**:模块、provider、DI 容器原理(E2)、pipe/guard/interceptor/exception filter 的执行顺序;对照 ASP.NET Core / Spring / FastAPI 的同类物。产出:365 API v2(NestJS)。
- **Week 5(Day 29–35)REST API 设计**:资源建模、page vs cursor 分页(C2)、版本化、idempotency key、OpenAPI(Swagger 模块自动生成)。产出:365 API 独立仓库 + OpenAPI 文档 + 中文设计文档。
- ✅ 检查点:重答 A1 A2 A3 C2 E2 G2。

## Phase 2(Day 36–75):PostgreSQL 从零 + Redis

> 本阶段语言无关度最高。SQL、索引、事务在任何技术栈里一字不差。

- **Week 6(Day 36–42)SQL 从零**:`docker run postgres` 起本地库(第一次接触 Docker,只用一条命令);SELECT/WHERE/JOIN/GROUP BY/HAVING/子查询/CTE/窗口函数。产出:20 道 SQL 练习题及答案(含 B1)。
- **Week 7(Day 43–49)数据建模与迁移**:范式、主键/外键/约束、枚举与 JSONB、迁移脚本(SQL 文件 → Prisma Migrate)。产出:365 API 的 ERD 与迁移文件。
- **Week 8(Day 50–56)索引、执行计划、事务**:B-tree、复合索引最左前缀、`LIKE '%x'` 为什么不走索引(B2)、EXPLAIN ANALYZE;ACID、四种隔离级别实验(脏读/不可重复读/幻读)、`SELECT ... FOR UPDATE` 悲观锁 vs version 列乐观锁(B3)、死锁复现。
- **Week 9(Day 57–63)ORM 与数据访问模式**:Prisma(或 Drizzle)、Repository 模式、N+1 与解法(B4)、连接池、ORM 里的事务。产出:365 API 接上 PostgreSQL。
- **Week 10(Day 64–70)Redis 与缓存(概念 #2)**:数据结构、Cache Aside、TTL、穿透/雪崩/击穿、分布式锁、session 存储;什么时候选 Redis 不选 PG(B5)。产出:365 API 加缓存层 + cheat sheet。
- **Week 11(Day 71–75,5 天)实战**:造 100 万行数据、autocannon 压测、索引前后对比、缓存前后对比。产出:中文性能报告。
- ✅ 检查点:重答 B1–B5。

## Phase 3(Day 76–105):Hetzner + Docker + HTTPS + CI/CD

> 从本阶段起,**每周至少部署一次到 Hetzner**,直到年底。

- **Week 12(Day 76–82)Linux 服务器基础(Hetzner)**:SSH key 登录、新建 sudo 用户、ufw 防火墙、`ss`/`lsof` 看端口、`df`/`du`、`journalctl`(D1)、systemd unit、fail2ban、自动安全更新。产出:(1)Caddy 静态托管现有 `docs/` HTML,**www.supergood-tech.de 第一次有内容**——一天完成,不用框架;(2)365 API 用 systemd 裸跑上线(还不用 Docker);写中文运维手册。
- **Week 13(Day 83–89)Docker**:镜像分层、多阶段构建、`.dockerignore`、非 root 用户、为什么先 COPY package.json(D2);docker compose 编排 API + PG + Redis(D3)、volume、network、healthcheck。产出:本地和 Hetzner 都用 compose 跑起来。
- **Week 14(Day 90–96)反向代理 + HTTPS + 健康检查(概念 #9)**:DNS A 记录、Caddy 自动 TLS(D4,Nginx + certbot 作对照)、环境变量与 secrets 管理、`/health` 端点、compose healthcheck 与重启策略。
- **Week 15(Day 97–103)GitHub Actions + 备份 + 日志(概念 #10 入门)**:typecheck/test/build → 构建镜像推 GHCR → SSH 部署到 Hetzner(D5);pg_dump 定时备份 + 恢复演练;pino 结构化日志、Uptime Kuma 探活。Day 103:K8s 概念一页纸——只讲概念,不安装(D6)。
- **Day 104–105 复盘**:写一篇「一个请求从浏览器到 Hetzner 上的容器经过了什么」。
- ✅ 检查点:重答 D1–D6。

## Phase 4(Day 106–140):认证、测试、安全、代码设计

- **Week 16(Day 106–112)认证授权**:argon2 密码哈希、session vs JWT、JWT 三段与签名验证、refresh token 轮换、登出与黑名单(A4)、OAuth2 授权码 + PKCE(GitHub 登录)、RBAC。产出:协议时序图 + 实现。
- **Week 17(Day 113–119)测试体系**:测试金字塔、Vitest 单元测试、supertest 集成测试(testcontainers 起真 PG)、一个 Playwright E2E、覆盖率门禁进 CI。
- **Week 18(Day 120–126)API 安全(概念 #7)**:Redis 令牌桶限流器(H1)、滑动窗口、CORS 真正原理——浏览器挡的是读响应不是发请求(A5)、helmet、输入校验、OWASP Top 10 逐条对照 365 API。
- **Week 19(Day 127–133)代码设计 I**:SOLID 逐条配重构例子、重构手法(extract function、参数对象)、纯函数与副作用分离、拆分 createOrder 并测试(E1)、DI 容器原理(E2)。
- **Week 20(Day 134–140)代码设计 II**:分层 → 六边形(Ports & Adapters)→ Clean Architecture 的演进逻辑,为什么业务层不能 import 框架(E3);DDD 战术模式(实体/值对象/聚合根/仓储)。产出:365 API 重构成六边形 + 一篇 ADR。
- ✅ 检查点:重答 A4 A5 E1 E2 E3 H1。

## Phase 5(Day 141–192):React 补强 4 周 + GraphQL + 实时 + Next.js 博客上线

> React 4 周按 3h/天设计,相当于 2h/天的 6 周。目标:达到德国 React 中高级面试水平。本阶段末,博客以 Next.js 三语版公开上线。

- **Week 21(Day 141–147)React 心智模型**:渲染阶段 vs 提交阶段、state 不可变、useEffect 生命周期与清理、竞态与 AbortController(G1)、依赖数组规则、自定义 hook、StrictMode 双调用。
- **Week 22(Day 148–154)React 数据与性能**:memo/useMemo/useCallback 何时该用何时不该用、TanStack Query 服务端状态、react-hook-form + zod(与后端共用 schema)、错误边界、Suspense。
- **Week 23(Day 155–161)React 工程**:组件设计(compound / headless)、Testing Library + MSW、可访问性基础、泛型组件与 discriminated props。
- **Week 24(Day 162–168)React 实战**:给 365 API 做管理前端(Vite):登录、每日任务列表、打卡;部署到 Hetzner。
- **Week 25(Day 169–175)GraphQL**:schema/resolver、DataLoader 解 N+1、缓存难点、与 REST 的取舍(C1)、codegen 端到端类型。产出:365 API 加 GraphQL 层,前端用 urql 或 Apollo。
- **Week 26(Day 176–182)实时通信**:长轮询 vs SSE vs WebSocket、ws/socket.io、房间、心跳与重连、Redis pub/sub 跨进程广播。产出:打卡动态实时推送。
- **Week 27(Day 183–192,10 天)Next.js App Router + 博客三语上线**:RSC、Server Actions、缓存策略、streaming;用 Next.js 重建博客——读取 `docs/` HTML 讲义生成文章页、目录页、Day 索引;next-intl 做 zh/en/de 路由(此时 en/de 只翻站点框架,文章仍是中文);standalone 输出打 Docker 镜像部署到 Hetzner。**www.supergood-tech.de 正式对外。**
- ✅ 检查点:重答 C1 G1 G2。

## Phase 6(Day 193–227):系统设计 10 大概念集中攻坚

- **Week 28(Day 193–199)概念 #1 + #3**:L4/L7、轮询/最少连接/一致性哈希;Caddy upstream 分发到 4 个 Node 进程的实验,对比 cluster(F3);CDN 缓存命中与失效,给博客静态资源接 CDN。
- **Week 29(Day 200–206)概念 #4 + #5**:compose 起 PG 主从、读写分离、故障切换;分片键选择、一致性哈希、跨分片查询的代价。
- **Week 30(Day 207–213)概念 #6**:RabbitMQ 或 BullMQ、at-least-once 与幂等消费、outbox 模式、死信队列。产出:平台邮件(注册确认、每日提醒)异步化。
- **Week 31(Day 214–220)概念 #10 深入**:OpenTelemetry traces、Prometheus metrics、Grafana 看板、告警规则。产出:全部部署到 Hetzner。
- **Week 32(Day 221–227)经典题 I**:URL shortener(F1)、限流器、通知系统、「DB 慢了按什么顺序排查」(F2)。每题一张架构图 + 中文设计稿,发布为博客文章。
- ✅ 检查点:重答 F1 F2 F3;10 个概念各一页 cheat sheet(除 #8)。

## Phase 7(Day 228–282):Capstone —— 365 平台 v1(8 周)

- 目标:任何前端程序员都能注册、按天学习、打卡、看进度、留言。
- 硬性要求:Next.js + NestJS + PostgreSQL + Redis + 消息队列 + Docker + GitHub Actions + Hetzner + 测试覆盖 + 可观测性 + 六边形架构 + 至少 6 个 10 大概念。
- **Week 33–34(Day 228–241)设计**:ERD(用户、计划、Day、打卡、评论)、API 设计、ADR、里程碑计划。
- **Week 35–38(Day 242–269)实现**:账号(邮箱 + GitHub OAuth)→ 每日打卡与连续天数 → 进度看板 → 评论 → 每日提醒邮件(MQ)。每 2 周一个可演示里程碑,写中文 dev log 并发布为博客文章。
- **Week 39–40(Day 270–282)打磨**:压测、安全检查、备份演练、README、演示视频。
- 产出:v1 线上可注册,README 挂地址。

## Phase 8(Day 283–302):AWS 3 周

> 把 Hetzner 上跑通的平台搬到 AWS 一次。目的是简历关键词 + 真实经历,不是深入 AWS。搬完再搬回 Hetzner,AWS 只保留可复现的 IaC 脚本。

- **Week 41(Day 283–289)**:IAM 最小权限、Budgets 成本告警(第一天就设)、EC2、安全组、VPC 概念;API 以 Docker 方式跑在 EC2。
- **Week 42(Day 290–296)**:RDS PostgreSQL、S3 + presigned URL(用户头像上传)、Secrets Manager;可选 ElastiCache。
- **Week 43(Day 297–302)**:GitHub Actions OIDC 免密部署、CloudWatch 日志;ECS Fargate 概念一页纸。产出:博客文章「同一项目两种云:Hetzner vs AWS」。

## Phase 9(Day 303–337):高级架构 + AI Engineering

- **Week 44(Day 303–309)概念 #8 + 分布式基础**:模块化单体 vs 微服务(什么时候不该拆)、API Gateway、CAP、重试/超时/熔断/降级/saga;手写 circuit breaker。
- **Week 45(Day 310–316)经典题 II**:订票系统、分布式 KV、指标监控系统;容量估算。发布为博客文章。
- **Week 46(Day 317–323)AI I:翻译 pipeline**:LLM API、structured output、prompt 与术语表;把 `docs/` 中文讲义批量翻译成 en/de,存库或存文件,构建时生成三语文章页。**博客从此真正三语。**
- **Week 47(Day 324–330)AI II:RAG 问答**:pgvector、chunking、检索评估;平台上线「问课程助手」,只回答课程内容。
- **Week 48(Day 331–337)AI III:生产化**:tool calling、评估、成本与延迟、Langfuse 可观测、guardrails。

## Phase 10(Day 338–365):365 平台 v2 + 全年复盘

- **Week 49(Day 338–344)SEO 与性能**:Lighthouse 全绿、sitemap、hreflang 三语、OG 图、图片优化、缓存头。
- **Week 50(Day 345–351)运营基础**:自托管统计(Umami 或 Plausible)、RSS、错误告警、备份/恢复再演练、安全审计(OWASP 逐条)。
- **Week 51(Day 352–358)公开 beta**:邀请 10 个前端程序员试用,收集反馈,修 bug,写 CONTRIBUTING(允许他人贡献讲义)。
- **Week 52(Day 359–365)全年复盘**:重答全部 25 道水平测试题、整理跨语言对照表成独立文章、三语年终技术总结《AI 时代:从前端到全栈——我的 365 天》。
- 可选:给 NestJS/Prisma/TanStack 提开源 PR,任何有余力的复盘日都可以做。

---

## 每日任务执行规则(给每日 Agent)

1. 先读 `progress.md`,确定当前 Day N = 已完成天数 + 1。只按 Day N 计数,不用日期。
2. 按**每天 3 小时**设计任务:50 min 学 + 100 min 做 + 30 min 写。同时标出「保底版」——只保留 90 min 的动手部分。
3. 每 7 天的第 7 天是复盘日:不出新内容。任务固定为默写、概念卡、对照表补行、对本周代码做 code review。
4. 当天讲义汇总为一个 HTML:文件名 `Day N - 主题.html`,放在 `docs/NN-主题/`(编号从 05 续接)。HTML 要有目录、章节图标、结尾总结。讲解把学员当 10 岁新手,多用生活比喻。
   讲义就是博客文章,按公开内容写:不含个人信息;`<head>` 里固定放 `<meta name="day">`、`<meta name="phase">`、`<meta name="summary">`,站点靠它们生成索引。
5. 习题代码写入 `src/NN-主题/`。
6. 概念先行,语言为器:先讲通用概念,再用 Node.js 举例;笔记含「概念卡」;学到对照表里的概念时补一行。
7. 从 Phase 3 起,每周至少一次真实部署到 Hetzner,任务里必须写明。
8. 每个 Phase 最后一天:重答该 Phase 覆盖的水平测试题,记录分数到 `progress.md`。未达 2/2 的题,下一 Phase 第一天补。
9. 涉及 10 大概念的周,显式标注编号(如「概念 #2 Caching」),并要求 cheat sheet 或最小实现。
10. 在 `progress.md` 追加一行:Day N、Phase/Week、任务摘要、产出、状态。
11. 全程中文,语气简洁、教练式,不寒暄;术语保留英文;代码标识符英文,注释中文。
