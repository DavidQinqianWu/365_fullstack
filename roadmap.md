# 365 天高级全栈工程师成长路线图

> 学员背景:7 年前端经验,目标成为高级全栈工程师,应聘全球市场(重点:德国/瑞士)。
> 技术主线:**全 TypeScript 栈**(Next.js + Node.js/NestJS)+ PostgreSQL + 云部署 + 系统设计 + AI Engineering。
> **核心学习策略:概念先行,语言为器。** 学员的优先级声明(置顶,所有阶段的最高指导原则):**语言不是重点,深刻理解后端才是。** 要重点吃透的通用领域:后端运行机制、**架构设计、系统设计、计算机网络、数据库、高并发、流量分发(负载均衡/分流)** 等——这些概念在任何语言里都一样。Node.js/TypeScript 只是顺手的「教具/练习语言」;**具体语言的深入(如 C#/.NET 生态工具链)等确定工作方向后再专题学**,届时靠概念映射快速上手即可。每个后端主题都要产出「概念卡 + 跨语言对照」,但不追求教具语言本身的边角知识。
> **教学模板(全年统一):后端一律以 NestJS 为模板,数据库一律以 PostgreSQL 为模板。**
> - **后端知识点从 NestJS 切入**:每个后端主题按「三步走」讲——① 先在 NestJS 里把它写出来、跑起来(看得见摸得着);② 再「掀开盖子」,讲这个机制背后的通用原理(Nest 帮你做了什么、不用 Nest 时要自己做什么);③ 最后跨语言对照(ASP.NET Core / Spring Boot / Go)。NestJS 的设计本身就对标 Spring / ASP.NET Core(模块、DI、装饰器、管线),是通往 .NET/Java 岗位的最佳跳板。
> - **一个项目从头长到尾**:从 Week 2 起,所有后端习题都写进同一个持续生长的 NestJS 项目 `nest-lab/`(任务管理服务),每周往里加一层能力(管线 → API → PG → 缓存 → 认证 → 测试 → 限流 → 架构 → 容器 → K8s → 安全 → 实时 → MQ),而不是每天写一次性脚本。
> - **数据库知识点在 PostgreSQL 上讲**:SQL、建模、索引、执行计划、事务、MVCC、锁、复制、分区、安全全部用 PG(docker 起实例,psql 里做实验),再接到 Nest 项目里(原生 SQL 用 `pg`,ORM 用 Prisma);讲完再说 SQL Server / MySQL 的差异点。Redis 只作为缓存/队列/限流的配角,不替代主库。
> - **例外**:Week 1 的运行时机制(event loop、流、进程、线程)用裸 Node 讲,因为 NestJS 就跑在这些机制之上;但每节课结尾都要补一段「这在 NestJS 里对应什么」。
> **已掌握模块:Next.js(App Router / RSC / Server Actions 等)学员已学完**——路线图中不再为它单独排课,Capstone 前端只做「够用的薄 UI」,省下的时间全部投入**后端深度与安全**。
> 时间标准:**每天 1.5 小时**(约 50 min 学习 + 30 min 动手练习 + 10 min 产出整理)。
> 原则:每天进步一点点,每天都有 GitHub 可见的产出(commit / PR / issue / 文档)。
> 语言策略:**产出以中文为主**——笔记、文档、README、设计稿一律用中文写,技术术语保留英文原文(如 event loop、middleware、transaction),先保证理解透;变量名、函数名保持英文(行业惯例),代码注释也用中文写;英文版产出(README/总结/面试表达)只作为有余力时或求职冲刺阶段的可选加分项,不作每日要求。

## 目标市场技术栈参考(德国/瑞士招聘高频 · TS 方向)

- 前端/全栈:React、Next.js(App Router、RSC、Server Actions)✅ 已掌握,只做后端视角复用、TypeScript 高级类型
- 后端:Node.js、NestJS、GraphQL/tRPC、WebSocket(**注意:欧洲市场 C#/.NET 与 Java 岗位同样极多,概念可迁移性是硬通货**)
- 数据:**PostgreSQL(全年数据库主线)**、Redis、消息队列(Kafka/RabbitMQ)、向量数据库(pgvector/Qdrant)
- DevOps / 云原生:Docker、Kubernetes(+ Helm、Argo CD)、Terraform(IaC)、CI/CD(GitHub Actions)、OpenTelemetry + Prometheus/Grafana、AWS 为主(Azure 在德国 .NET 公司常见)
- AI Engineering:LLM API、RAG、Agent、Vercel AI SDK / LangChain.js(欧洲市场 2025+ 高增长方向)

---

## 后端概念跨语言对照表(全年持续补充 · 求职迁移用)

> 这就是后端世界的「Vue ↔ React 对照表」。每学一个概念,就在对应行补上你亲手验证过的理解。
> 目标:面试 C#/.NET 岗位时,能把每个 .NET 名词翻译回你已掌握的通用概念。

| 通用概念 | Node.js / TS 生态(你的教具) | C# / .NET | Java | Go |
|---|---|---|---|---|
| 运行时与并发模型 | event loop + libuv 线程池 + worker_threads | 线程池 + async/await (Task) | 线程池 / virtual threads (Loom) | goroutine + channel |
| Web 框架 | **NestJS(本课程模板)**,底层默认跑在 Express 上(可换 Fastify) | ASP.NET Core | Spring Boot | Gin / Echo |
| 请求管线 / 中间件 | NestJS middleware → guard → interceptor → pipe → exception filter | Middleware pipeline + Filter | Filter / Interceptor (AOP) | middleware(handler 链) |
| 依赖注入(DI) | NestJS IoC 容器 | 内置 DI(Microsoft.Extensions.DI) | Spring IoC | 手动注入 / wire |
| AOP / 横切关注点 | Interceptor + Guard + Pipe + Filter,自定义装饰器 + `Reflector` 读元数据 | Action Filter / Middleware、Castle DynamicProxy | Spring AOP(`@Aspect` / `@Around`) | middleware 装饰 handler |
| 声明式事务 / 事务传播 | Prisma `$transaction`、`nestjs-cls` + `@Transactional()`(AsyncLocalStorage) | EF Core `DbContext` 工作单元、`TransactionScope` | Spring `@Transactional`(传播行为 REQUIRED / REQUIRES_NEW) | `sql.Tx` 显式传递 |
| ORM / 数据访问 | Prisma / Drizzle | EF Core(LINQ) | Hibernate / JPA | GORM / sqlx |
| DB 迁移 | Prisma Migrate | EF Core Migrations | Flyway / Liquibase | goose / migrate |
| 认证授权 / 安全框架 | Passport + NestJS Guard、helmet | ASP.NET Core Identity + Authorization Policy、Data Protection | Spring Security | middleware + golang-jwt / casbin |
| 输入校验 | zod / class-validator | DataAnnotations / FluentValidation | Bean Validation | validator |
| 配置与环境 | dotenv + 类型安全 env | appsettings.json + Options 模式 | application.yml + @ConfigurationProperties | env / viper |
| 结构化日志 | pino / winston | Serilog / ILogger | SLF4J + Logback | slog / zap |
| 测试 | Vitest / Jest / supertest | xUnit + WebApplicationFactory | JUnit + MockMvc | testing + httptest |
| API 文档 | OpenAPI/Swagger(语言无关标准) | Swashbuckle / Scalar | springdoc | swag |
| 后台任务 / 定时 | BullMQ / node-cron | Hangfire / BackgroundService | Quartz / @Scheduled | cron / asynq |
| 缓存客户端 | ioredis | StackExchange.Redis | Lettuce / Redisson | go-redis |
| 消息队列 | amqplib / kafkajs | MassTransit / NServiceBus | Spring AMQP / Kafka | sarama / amqp |
| 流式 I/O(Stream/Buffer/背压) | stream.Readable/Writable、Buffer、pipeline、write→drain 背压 | System.IO.Stream、byte[]/Span、CopyToAsync、await 隐式背压 | InputStream/OutputStream、ByteBuffer(NIO)、transferTo、Reactive Streams request(n) | io.Reader/io.Writer、[]byte、io.Copy、阻塞读写天然背压 |
| 共享内存与原子操作(防竞态) | SharedArrayBuffer + Atomics(worker_threads 默认不共享,消息传递为主) | Interlocked / lock / Monitor | AtomicInteger / synchronized / JUC | sync/atomic / sync.Mutex(提倡 channel 通信) |
| 数据加密 / 密钥管理 | node:crypto(AES-GCM)、pgcrypto、AWS KMS / Vault SDK | Data Protection API、SQL Server Always Encrypted / TDE、Azure Key Vault | JCE、Spring Vault、Google Tink | crypto/aes、Vault SDK、Tink |

学习要求:每周后端任务产出的笔记中,**必须有「概念卡」**(这个概念的通用定义,不绑定任何语言)+ 在上述表格对应行补充一句话心得。

---

## 必懂的 10 个 System Design 核心概念(全年主线,显式嵌入各周)

| # | 概念 | 关键词 | 落点 |
|---|---|---|---|
| 1 | Load Balancer | 流量分发、L4/L7、健康路由 | Week 25 |
| 2 | Caching | Redis + Cache Aside、穿透/雪崩 | Week 8 |
| 3 | CDN | 内容分发加速、边缘缓存 | Week 25 |
| 4 | Database Replication | 主从复制、读写分离、高可用 | Week 26(Week 9 实战预热) |
| 5 | Sharding | 水平扩展、分片键、再平衡 | Week 26 |
| 6 | Message Queues | Kafka / RabbitMQ、异步解耦 | Week 27 |
| 7 | Rate Limiting | 令牌桶/滑动窗口、接口保护 | Week 12(Redis 实现) |
| 8 | Circuit Breaker | 故障隔离、熔断/降级 | Week 41 |
| 9 | Health Checks | 服务探活、liveness/readiness | Week 19 |
| 10 | Observability | Logs + Metrics + Traces | Week 19(Week 46 进阶到 LLM) |

学习要求:每个概念都要「能画图 + 能手写最小实现或配置 + 能用中文 5 句话讲清楚」。(面试需要的英文版表达,留到求职冲刺阶段统一补,不占用日常学习时间。)

---

## Phase 1(Day 1–21 · Week 1–3):后端运行机制 — 服务端是怎么跑起来的

> 本阶段主题:任何后端语言都绕不开的底层机制——**运行时、并发模型、HTTP 协议、Web 框架解剖**。Node.js 只是第一个观察样本,每周都要回答一个问题:「这个机制在 .NET / Java / Go 里长什么样?」

- Week 1:运行时与并发模型 I(以 Node.js 为例):event loop、流、Buffer、进程模型、worker_threads;**概念卡:单线程事件循环 vs 多线程线程池(.NET/Java)vs 轻量协程(Go),三种并发模型的取舍**
- Week 2:**NestJS 入门 + IoC/DI + AOP(框架的两大支柱)**——这两个概念是 Spring 和 ASP.NET Core 的灵魂,学透了换框架只是换语法,按天拆:
  - D1 · `nest new nest-lab` 起项目:Module / Controller / Provider 三件套、装饰器在做什么、一个请求在 Nest 里走过的完整生命周期
  - D2 · **依赖注入(DI)与控制反转(IoC)**:为什么不自己 `new`(可替换、可测试);IoC 容器做了什么(注册 → 解析依赖图 → 实例化 → 注入);Provider 的三种作用域(singleton 默认 / request / transient)及其性能代价;自定义 Provider(`useClass` / `useValue` / `useFactory`)与 injection token;循环依赖与 `forwardRef`;**实验:用 `reflect-metadata` 手写一个 50 行的迷你 IoC 容器**,看清 Nest 的 `@Injectable()` 背后发生了什么
  - D3 · **面向切面编程(AOP)**:什么是横切关注点(日志、鉴权、计时、缓存、事务、异常处理——每个接口都要,但不属于任何一个接口的业务);Nest 把 AOP 拆成管线五件套:middleware → guard → interceptor → pipe → exception filter,各自在什么时机执行、能拿到什么、适合放什么;**实验:写一个计时 Interceptor + 一个统一响应包装 Interceptor,不改一行业务代码给所有接口加能力**
  - D4 · 自定义装饰器 + 元数据(`SetMetadata` / `Reflector`):`@Public()`、`@Roles()` 这类「给方法贴标签,切面里读标签」的套路——这就是 AOP 在 Nest 里的完整闭环
  - D5 · TypeScript 服务端类型实战:类型安全的 env 配置(`@nestjs/config` + zod 校验)、DI token 的类型安全、zod 推导类型(原独立的 TS 高级类型周已并入此处,语言不是重点)
  - D6 · 小实战:给 `nest-lab/` 加全局日志、计时、异常过滤;D7 · 复盘
  - **跨语言对照**:DI ↔ ASP.NET Core 内置 DI(`AddSingleton/AddScoped/AddTransient`,和 Nest 三种作用域一一对应)/ Spring IoC(`@Component` + `@Autowired`);AOP ↔ Spring `@Aspect` + `@Around` / ASP.NET Core Action Filter + Middleware。**概念卡:IoC 与 AOP 各解决什么问题,为什么企业级框架都长这样**
- Week 3:API 设计(语言无关):**HTTP 语义深入(方法、状态码、幂等性、内容协商)、REST 约束、版本化、分页、统一错误格式(RFC 7807 problem+json)、OpenAPI 规范**;**DTO 与验证专题**:DTO 是什么(接口的「进出口报关单」,和数据库 Entity 分开的原因)、`class-validator` + `class-transformer` + 全局 `ValidationPipe`(`whitelist` 丢弃多余字段、`transform` 自动转类型、嵌套对象与数组校验、自定义校验器)、zod 方案对比;**响应 DTO**:用 `ClassSerializerInterceptor` + `@Exclude()` 防止把密码哈希等字段返回给前端;实战:在 `nest-lab/` 里实现完整 REST API(任务管理服务),全局 exception filter 输出 problem+json、`@nestjs/swagger` 从 DTO 自动生成 OpenAPI;设计文档按语言无关的方式写;对照:ASP.NET Core DataAnnotations / FluentValidation、Spring Bean Validation(`@Valid`)
- GitHub 产出:每天提交代码或中文笔记;Week 3 项目独立仓库,中文 README;**每周一张概念卡 + 对照表更新**

## Phase 2(Day 22–63 · Week 4–9):数据层 — 数据库是后端的心脏(以 PostgreSQL 为主线)

> 本阶段是整个路线图中**语言无关度最高**的部分:SQL、事务、索引、缓存模式在任何技术栈里一字不差。**数据库统一以 PostgreSQL 为主线**(欧洲招聘高频,开源且功能最全;学透 PG 再看 SQL Server / MySQL 只是方言差异)。ORM 则是最体现「同概念不同实现」的典型(Prisma ≈ EF Core ≈ Hibernate)。
> 调整说明:原来一周塞了 SQL + 索引 + 事务,已拆成 Week 4–6 三周,并在 Week 9 加入 PG 运维。

- Week 4:**PostgreSQL 入门 + SQL 与数据建模**:docker 起 PG、psql 基本功;关系模型与范式(1NF–3NF)以及什么时候反范式;主键选择(自增 vs UUID v7)、外键与约束(NOT NULL / UNIQUE / CHECK)当作「数据库层的最后一道校验」;SQL 深入(JOIN 全家、子查询 vs CTE、窗口函数、`UPSERT` / `ON CONFLICT`、`RETURNING`);PG 特色类型:JSONB(何时用、何时别用)、数组、`timestamptz`(时区坑);**概念卡:schema 设计是最难改的决定**
- Week 5:**索引与查询优化(PG)**:B-tree 原理与复合索引最左前缀、覆盖索引(`INCLUDE`)、部分索引 / 表达式索引、GIN(JSONB/全文搜索)/ BRIN(时序大表)各自场景;`EXPLAIN (ANALYZE, BUFFERS)` 读执行计划(Seq Scan / Index Scan / Bitmap / Nested Loop / Hash Join)、统计信息与 `ANALYZE`、`pg_stat_statements` 找慢查询;索引的代价(写放大);**实验:百万行数据,优化前后 EXPLAIN 对比**;并把 `nest-lab/` 的慢接口抓出来,看它发给 PG 的 SQL 和执行计划
- Week 6:**事务与并发控制(PG)**:ACID 逐个字母拆开;四种隔离级别与 PG 实际行为(Read Committed 默认、Repeatable Read 即快照、Serializable 的 SSI 与重试);**MVCC**(为什么读不阻塞写)、`VACUUM` 与表膨胀;锁:行锁 `SELECT ... FOR UPDATE / SKIP LOCKED`(用 PG 实现任务队列)、表锁、死锁复现与排查、advisory lock;乐观锁(version 字段)vs 悲观锁;连接池原理(为什么 PG 一个连接一个进程,PgBouncer 解决什么);**实验:两个 psql 窗口复现脏读/不可重复读/幻读/丢失更新**;再在 `nest-lab/` 里用并发请求复现「超卖/丢失更新」,分别用乐观锁和 `FOR UPDATE` 修好
- Week 7:ORM 与数据访问模式(**重点学模式,不是学 Prisma**):ActiveRecord vs DataMapper、Unit of Work、Repository 模式争议、N+1 问题;在 NestJS 里落地:`PrismaService` 作为 Provider 注入、事务(`$transaction`)跨 Service 怎么传、一个请求一个事务的边界;顺带看一眼 Nest 官方另一条路 TypeORM(装饰器实体,更像 EF Core / Hibernate);对照 EF Core 的 LINQ + DbContext 写法写一页对照笔记;**何时该绕过 ORM 写原生 SQL**(报表、批量、窗口函数);**事务传播专题**:为什么事务不该写在 Controller 里;「一个业务操作跨多个 Service 时,怎么让它们共用同一个事务」——用 AsyncLocalStorage(`nestjs-cls` + `@Transactional()`)实现,对照 **Spring `@Transactional`(面试必考的传播行为 REQUIRED / REQUIRES_NEW)** 和 EF Core 的 `DbContext` 一个请求一个工作单元;事务里不要调外部 HTTP、不要做长任务(锁会被一直占着)
- Week 8:**Redis 与缓存**(**概念 #2 Caching**):Redis 是什么(内存里的数据结构服务器)、五种常用数据结构各自的典型用法(String 缓存/计数、Hash 对象、List 队列、Set 去重、ZSet 排行榜)、TTL 与内存淘汰策略(LRU/LFU)、持久化 RDB vs AOF;缓存模式:Cache Aside / Read-Through / Write-Behind;**缓存一致性**(先更新库再删缓存、为什么不是先删缓存、延迟双删);穿透 / 雪崩 / 击穿与各自解法(空值缓存 + 布隆过滤器、TTL 加随机抖动、互斥锁重建)、热 key;分布式锁(`SET NX PX` + 过期 + 只删自己的锁)、会话存储——模式全部语言无关;在 NestJS 里用 `@nestjs/cache-manager` + Redis store,再手写一个缓存 Interceptor(呼应 Week 2 的 AOP)看清它的原理;对照:.NET `IDistributedCache` / Spring `@Cacheable`
- Week 9:**PG 运维 + 实战**:零停机 schema 迁移(expand → migrate → contract,加列/改列/建索引 `CONCURRENTLY` 不锁表)、备份与恢复(`pg_dump` 逻辑备份 vs WAL + PITR 时间点恢复,**做一次恢复演练**)、分区表入门;实战:给 `nest-lab/` 接上 PostgreSQL(迁移脚本、种子数据)+ Redis 缓存层,写性能对比笔记;预热**概念 #4**:本地起主从两个 PG 实例观察流复制;**可选加深:NoSQL 全景认知一页纸(文档型 MongoDB / KV / 宽列 Cassandra / 图),各自解决什么问题**
- GitHub 产出:`db-lab/`(建模 ER 图、索引优化前后 EXPLAIN 对比 markdown、四种隔离级别 + 死锁复现脚本、`SKIP LOCKED` 任务队列、零停机迁移示例、备份恢复演练记录)、cache-aside 实现代码

## Phase 3(Day 64–91 · Week 10–13):工程化 — 认证、测试、架构风格 I

- Week 10:认证授权(**协议层,语言无关**):**JWT 专题**:结构(header.payload.signature,payload 只是 Base64 不是加密)与签名验证原理、HS256(共享密钥)vs RS256(私钥签 + 公钥验,JWKS 发布公钥,适合多服务)、经典攻击(`alg: none`、算法混淆、不校验 `exp`/`aud`/`iss`);存哪里(httpOnly + Secure + SameSite Cookie vs localStorage 与 XSS);**JWT 无法主动作废的问题**与解法(短 access token + Refresh Token 轮换 + 复用检测、Redis 黑名单/版本号);Session vs JWT 的取舍、OAuth2/OIDC 流程(授权码模式 + PKCE)、RBAC vs ABAC 权限模型;NestJS 落地:`@nestjs/passport` + JWT Strategy、`AuthGuard`、自定义 `@Roles()` 装饰器 + `RolesGuard`、`@CurrentUser()` 参数装饰器;产出物是协议时序图 + 「Guard 在请求管线里的位置」图
- Week 11:测试体系(测试金字塔是通用方法论):单元/集成/E2E 的边界划分、测试替身(mock/stub/fake)、覆盖率门禁;NestJS 测试:`Test.createTestingModule` + `overrideProvider` 做单元测试替身、supertest 打 e2e、Testcontainers 起真实 PostgreSQL 做集成测试(不 mock 数据库);对照 xUnit + WebApplicationFactory 的等价物
- Week 12:API 安全与质量(**概念 #7 Rate Limiting**:用 Redis 手写令牌桶 + 滑动窗口限流器,封装成 NestJS Guard,再对比官方 `@nestjs/throttler`;`main.ts` 里的 helmet、CORS 配置原理;`ValidationPipe` 的 `whitelist` / `forbidNonWhitelisted` 防批量赋值;OWASP Top 10)——知识是协议与模式层面的,落地在 Nest 管线上
- Week 13:**架构风格 I(代码级架构,新增重点)+ 实战**:分层架构 → 六边形架构(Hexagonal / Ports & Adapters)→ Clean Architecture 的演进逻辑;**DDD 战术模式入门**(实体、值对象、聚合根、仓储);NestJS 落地:Module 作为限界上下文、端口 = 接口 + injection token、适配器 = 可替换的 Provider(PG 仓储 / 内存仓储一键切换);实战:用六边形架构重构 `nest-lab/`并落地完整认证模块,测试覆盖率 ≥80%,附中文 SECURITY.md;**对照:微软官方 Clean Architecture 模板(eShop 参考应用)的目录结构**
- GitHub 产出:测试 PR、限流器代码、架构重构前后对比笔记(为什么端口-适配器模式让你换数据库/换框架时业务代码不动)

## Phase 4(Day 92–133 · Week 14–19):DevOps 与云原生 — Docker / CI/CD / Kubernetes / Terraform / 云

> 本阶段天然语言无关:Docker、K8s、CI/CD、IaC 不关心你容器里跑的是 Node 还是 .NET。
> 调整说明:原来 K8s 只占半周「入门」,现扩为两整周,并新增 IaC(Terraform)与 AWS 落地周——这些是德国/瑞士后端与全栈岗位 JD 的高频硬要求。
> 一条主线贯穿 6 周:**同一个任务服务,从「本机能跑」→ 容器 → 流水线 → K8s 集群 → 用代码造出来的云环境 → 看得见它的健康状态。**

- Week 14:**Docker 深入**:镜像 vs 容器(菜谱 vs 做出来的菜)、镜像分层与缓存、多阶段构建、`.dockerignore`、网络(bridge / 端口映射 / 容器间 DNS)与数据卷、docker compose 编排全栈本地环境(API + PostgreSQL + Redis)、容器里的信号处理与优雅关闭(PID 1、SIGTERM——呼应 Day 4 进程模型);**容器安全基线**(非 root 运行、最小基础镜像 distroless/alpine、镜像漏洞扫描 Trivy);**概念卡:容器 ≠ 虚拟机**(namespace + cgroup 隔离,共享内核)
- Week 15:**CI/CD(GitHub Actions)**:流水线 = lint → test → build 镜像 → 推送镜像仓库(GHCR/ECR)→ 部署;缓存、矩阵构建、可复用 workflow、环境与审批门禁、secrets 与 OIDC 免密钥登录云;镜像打 tag 策略(git sha vs semver);**概念卡:CI(持续集成)vs CD(持续交付/部署)**
- Week 16:**Kubernetes 核心**:为什么需要编排(一台机器管容器 vs 一千台);控制平面 vs 节点、「期望状态 + 控制循环」思想;Pod、Deployment、ReplicaSet、Service(ClusterIP/NodePort/LoadBalancer)、Namespace、ConfigMap、Secret;`kubectl` 基本功与排障(`describe` / `logs` / `exec`、CrashLoopBackOff、ImagePullBackOff);用 kind 或 k3d 在本地起集群,把任务服务 + PostgreSQL 跑上去
- Week 17:**Kubernetes 生产化**:Ingress / Gateway API(L7 路由 + TLS,cert-manager)、liveness / readiness / startup probe、资源 requests/limits 与 OOMKilled、HPA 自动扩缩容(压测看副本数变化)、滚动更新与回滚、PodDisruptionBudget;有状态服务(StatefulSet、PVC)以及「为什么生产数据库通常用托管 RDS 而不放进 K8s」;**Helm** 打包应用(chart、values 分环境);**GitOps 入门**(Argo CD:git 即期望状态);K8s 安全基础(RBAC、NetworkPolicy、Pod Security)
- Week 18:**云与基础设施即代码(AWS + Terraform)**:云的核心积木(VPC / 子网 / 安全组、IAM 最小权限、ECR、RDS PostgreSQL、S3、托管 K8s EKS vs 更简单的 ECS Fargate 取舍);**Terraform**:provider / resource / state / plan → apply、远程 state 与锁、模块化、多环境(dev/prod);用 Terraform 造一个最小环境(VPC + RDS + 运行服务),域名与 HTTPS;**成本意识**:用完 `terraform destroy`,设预算告警;**概念卡:IaC 为什么比在控制台点按钮可靠**(可审查、可复现、可回滚);对照:Azure(Bicep/AKS)与 GCP(GKE)的等价物——德国很多 .NET 公司用 Azure
- Week 19:**概念 #9 + #10**:健康检查(与 Week 17 的 K8s probe 打通)+ 可观测性(**结构化日志、Metrics、Traces 三大支柱是语言无关的**,OpenTelemetry 本身就是跨语言标准;NestJS 侧用 `@nestjs/terminus` 做健康检查、`nestjs-pino` 做结构化日志(带 request id)、OpenTelemetry SDK 自动埋点,后端用 Prometheus + Grafana + Loki/Tempo);告警与 SLO 入门(SLI / SLO / 错误预算)
- GitHub 产出:`infra/` 目录(Dockerfile + compose、workflow 文件、K8s manifest、Helm chart、Terraform 模块、Grafana 面板 JSON)+ 中文部署文档(含「从零到上线」步骤与 `terraform destroy` 清理说明)

## Phase 5(Day 134–168 · Week 20–24):应用安全攻防 · 数据安全 · API 范式 · 实时通信

> 调整说明:原「Next.js App Router 深入」周已删除(学员已掌握),改为**应用安全攻防**;本次再新增**后端数据安全周**,与攻防周组成连续两周的安全专题。Next.js 只在 Week 22 以「Server Actions 是一种 RPC」的后端视角出现一次。

- Week 20:**应用安全攻防周**——用「攻击者视角」先亲手复现漏洞、再修复,每个漏洞产出「攻击步骤 → 根因 → 修复 → 跨语言对照」:
  - 注入家族:SQL / NoSQL / 命令注入(呼应 Day 4 的 shell 注入炸弹)、参数化查询为什么能根治
  - 浏览器侧攻击的**服务端防线**:XSS 与 CSP、CSRF 与 SameSite Cookie、安全响应头(HSTS、X-Frame-Options)
  - 服务端特有漏洞:SSRF(云元数据接口 169.254.169.254)、IDOR / 越权访问(BOLA,OWASP API Security Top 10 第 1 名)、批量赋值(mass assignment)
  - 密码学实用层:密码存储(bcrypt/argon2:加盐 + 慢哈希)、TLS 握手原理、对称/非对称加密与签名的区别
  - 供应链安全:lockfile、npm audit、Dependabot、SBOM
  - **威胁建模**:STRIDE 方法给任务服务画一张威胁图
  - 对照:ASP.NET Core Antiforgery、Spring Security 的等价能力
- Week 21:**后端数据安全周(新增重点)**——上周是「别让坏人进门」,这周是「**就算进了门、拖走了库,也拿不到有用的数据**」。主线实验:先用 Week 20 的 SQL 注入把用户表拖出来,然后一层层加防线,每加一层重新「拖库」一次,看泄露出去的东西还剩多少价值:
  - **数据分级分类**:公开 / 内部 / 机密 / 个人数据(PII)/ 特殊类别个人数据(GDPR 第 9 条:健康、宗教等);先分级,再决定每一级的保护强度
  - **传输中加密**:应用到 PG 强制 TLS(`sslmode=verify-full`,不是只开 `require`)、服务间 mTLS 概念
  - **静态加密的三层**:磁盘/云盘加密(防偷硬盘)→ 数据库层(PG `pgcrypto`)→ **应用层字段加密**(AES-256-GCM,防 DBA 和拖库);三层各自防住谁、防不住谁,做成一张表
  - **密钥管理**:信封加密(envelope encryption:数据密钥加密数据,主密钥加密数据密钥)、AWS KMS / HashiCorp Vault、密钥轮换不停机、**加密粉碎**(crypto-shredding:删掉某用户的密钥 = 该用户数据在所有备份里同时作废)
  - **加密后还要能查**:盲索引(blind index,HMAC 做等值查询)、哈希 vs 加密 vs 令牌化(tokenization)的区别
  - **最小权限(PG 落地)**:应用账号永不用 superuser;迁移账号 / 读写账号 / 只读报表账号分离;`GRANT` / `REVOKE` / 默认权限;**Row-Level Security(RLS)** 做多租户隔离与越权兜底(实验:故意写一个漏掉 `tenant_id` 的查询,看 RLS 能不能挡住)
  - **审计**:谁在什么时候看了 / 改了哪条敏感数据(`pgaudit` + 应用层审计表);审计日志只追加、防篡改(哈希链)
  - **泄露的侧门**:日志与错误信息里的 PII(pino `redact` 脱敏)、备份文件(必须加密 + 定期恢复演练)、开发/测试环境的生产数据副本(数据脱敏 masking / 生成假数据)、分析导出
  - **secrets 管理**:数据库密码和 API key 不进 git(gitleaks 扫描)、Secrets Manager、短期动态凭证(Vault 动态 DB 账号)、轮换
  - **合规概念卡:GDPR/DSGVO 与瑞士 nDSG 对后端设计的影响**:数据最小化、存储期限与自动删除(TTL 任务)、删除权与导出权接口、假名化 vs 匿名化(假名化的数据仍是个人数据)、数据驻留(数据存在哪个国家)、72 小时泄露通报——德国/瑞士面试高频
  - NestJS 落地:字段加解密封装成 `CryptoService` Provider(Prisma 中间件/扩展里自动加解密)、审计用 Interceptor、日志脱敏用 `nestjs-pino` 的 `redact`;PG 侧:角色与 RLS 用迁移脚本管理
  - 对照:SQL Server Always Encrypted / TDE、ASP.NET Core Data Protection、Java JCE + Spring Vault、Go `crypto/aes` + Vault SDK
- Week 22:API 范式横向对比(**概念卡:REST vs GraphQL vs RPC(tRPC/gRPC)各自的适用场景**——gRPC 在 .NET/Java 微服务里极高频):在 NestJS 里各写一遍:`@nestjs/graphql`(code-first)、gRPC(`@nestjs/microservices` 的 gRPC transport)、tRPC(nestjs-trpc 或独立 adapter),对比 REST 写中文复盘;**把已掌握的 Next.js Server Actions 当作「框架内置 RPC」纳入对比**(只写一页后端视角笔记:它在网络上实际发了什么请求、如何鉴权、如何防 CSRF),不额外占课时;**GraphQL 安全**:查询深度/复杂度限制、introspection 关闭
- Week 23:实时通信协议(语言无关):长轮询 vs SSE vs WebSocket vs WebRTC 的原理与取舍、乐观更新、presence/协作基础;NestJS 落地:`@Sse()` 做服务端推送、WebSocket Gateway(`@nestjs/websockets`,ws/socket.io adapter)、Gateway 上的鉴权 Guard、多实例下用 Redis adapter 广播;标注 SignalR(.NET)的等价能力
- Week 24:实战 — 给已有项目加实时通知模块 + tRPC/GraphQL 层
- GitHub 产出:`security-lab/`(每个漏洞一个「复现 → 修复」前后对比目录 + STRIDE 威胁模型图)、`data-security-lab/`(「拖库实验」每加一层防线的前后对比、字段加密 + 盲索引 + 信封加密实现、PG 权限与 RLS 脚本、日志脱敏配置、数据分级表 + GDPR 概念卡)、实时模块代码、三种 API 范式对比文章(中文 markdown)

## Phase 6(Day 169–203 · Week 25–29):系统设计基础(10 大概念集中攻坚)

- Week 25:**概念 #1 Load Balancer + #3 CDN**(L4/L7、轮询/最少连接、Nginx/HAProxy 本地实验、CDN 缓存命中与失效)
- Week 26:**概念 #4 Database Replication + #5 Sharding**(主从复制、读写分离、故障切换直觉;分片键选择、一致性哈希、跨分片查询)
- Week 27:**概念 #6 Message Queues**(Kafka/RabbitMQ、事件驱动架构、**幂等性、at-least-once vs exactly-once、outbox 模式**——这些语义在任何 MQ 客户端里都一样;NestJS 落地:`@nestjs/microservices` 的 RabbitMQ / Kafka transport、`@MessagePattern` vs `@EventPattern`,outbox 表放在 PostgreSQL 里)
- Week 28:经典系统设计题 I(URL shortener、限流器、feed 系统)—— 每题画架构图 + 中文设计稿,强制用上已学概念
- Week 29:实战 — 在 `nest-lab/` 中引入消息队列,实现异步任务(邮件/报表):`@nestjs/bullmq` 任务队列 + `@nestjs/schedule` 定时任务;**对照:.NET 的 Hangfire/MassTransit、Java 的 Quartz 解决同类问题**
- GitHub 产出:`system-design/` 目录,每题一个中文 markdown + mermaid 架构图;10 个概念各一页中文 cheat sheet

## Phase 7(Day 204–238 · Week 30–34):全栈 Capstone 项目 1

- 题目建议:多租户 SaaS(如团队协作/招聘平台 clone,贴合欧洲市场业务)
- 要求:NestJS + PostgreSQL + Redis + Docker + CI/CD + **K8s(Helm 部署)+ Terraform 管理云资源** + 完整测试;**前端用已掌握的 Next.js 做够用的薄 UI,不在前端打磨上花时间**;
- **后端与安全加码(用省下的前端时间)**:多租户数据隔离(PostgreSQL Row-Level Security vs 每租户 schema 的取舍)、审计日志、**按 Week 21 的标准做数据安全**(数据分级表、PII 字段加密 + 盲索引、最小权限 DB 账号、日志脱敏、加密备份 + 恢复演练)、上线前 STRIDE 威胁建模 + OWASP ASVS Level 1 自查清单、GDPR 数据导出/删除接口;必须用到至少 5 个 10 大概念(缓存、限流、健康检查、可观测性、消息队列);**代码组织必须按 Week 13 学的六边形架构,并在 README 里写清「如果明天换成 ASP.NET Core,哪些层可以原样保留思路」**
- 文档语言:中文 README、commit message、issue/PR;每 2 周一个可演示里程碑,写中文 dev log
- GitHub 产出:主仓库持续提交,部署链接挂在 README

## Phase 8(Day 239–273 · Week 35–39):全栈 Capstone 项目 2 + 开源贡献

- Week 35–37:第二个项目(压缩为 3 周,只做实时特性这一个新增点,其余复用 Capstone 1 的工程骨架)(建议含实时特性:协作编辑/通知/白板,用上 Phase 5 的 WebSocket 能力)
- Week 38–39:开源贡献(由 3 周压到 2 周,让时间给云原生) — 给 NestJS/Prisma/tRPC/Fastify 等**后端**仓库提 PR(从 good first issue 开始;开源 PR 的标题与描述按目标仓库惯例用英文,这是极少数必须用英文的场景)
- **可选支线(有余力时):用 C#/.NET 把一个已有小项目(如 Week 3 的任务管理 API)重写一遍**——这是对全年「概念可迁移性」学习策略的终极检验,也是对标欧洲 .NET 岗位的直接作品
- GitHub 产出:开源 PR 记录、项目 2 仓库

## Phase 9(Day 274–294 · Week 40–42):高级系统设计 + 架构风格 II

- Week 40:**微服务设计模式(架构风格 II)**——先回答「该不该拆」,再学「拆了怎么活」:
  - 拆分:模块化单体 vs 微服务的取舍(团队规模、部署独立性、什么时候不该拆)、按业务能力 / 限界上下文拆、**绞杀者模式(Strangler Fig)** 渐进迁移;实验:把 `nest-lab/` 的一个 Module 拆成独立 Nest 微服务,体会拆分成本
  - 通信:同步(REST/gRPC)vs 异步(事件)、**API Gateway** 与 **BFF**(给不同前端各配一个后端)、服务发现、**API 组合**(跨服务查询怎么拼)
  - 数据:**每服务独立数据库**(为什么不能共享一个 PG 库)、**CQRS**(读写分离成两个模型)、**事件溯源(Event Sourcing)入门**、回顾 Week 27 的 outbox 与幂等消费
  - 横切:分布式追踪的 trace id 透传(接 Week 19)、服务网格 / sidecar 概念
  - NestJS 落地:`@nestjs/microservices` 的 transport 抽象、`ClientProxy` 调用其他服务、混合应用(一个服务同时对外 HTTP 和对内消息)
  - 对照:.NET 的 eShop 参考架构 / Dapr、Spring Cloud(Gateway、Eureka、Config)
- Week 41:**分布式一致性与可靠性 · 概念 #8 Circuit Breaker**:CAP 与一致性模型(强一致 / 最终一致)、分布式锁的坑(Redis 锁 vs PG advisory lock)、leader election 直觉;可靠性设计(重试、熔断、降级、超时预算、**saga 分布式事务**(编排式 vs 协同式、补偿操作怎么写,为什么跨服务不能用数据库事务);手写一个熔断器,封装成 NestJS Provider / Interceptor 包住外部 HTTP 调用,再对比 opossum)——对照 .NET 生态的 Polly 库,你会发现设计一模一样
- Week 42:经典系统设计题 II(设计 Uber/订票系统/分布式 KV/指标监控系统)—— 中文设计稿 + 容量估算
- GitHub 产出:高级设计文档、熔断器代码

## Phase 10(Day 295–322 · Week 43–46):AI Engineering 基础(TS 栈)

- Week 43:LLM 应用基础(OpenAI/Anthropic API、prompt 工程、structured output、function/tool calling)
- Week 44:RAG 实战(embedding、chunking 策略、pgvector/Qdrant、检索评估)—— 用 TS 实现完整 RAG pipeline,作为 NestJS 服务暴露;向量存储优先用 **pgvector**(继续 PostgreSQL 主线)
- Week 45:Agent 与工具链(Vercel AI SDK 或 LangChain.js、多步工具调用、Human-in-the-loop、流式 UI)
- Week 46:生产化(**概念 #10 进阶**:LLM 可观测性 Langfuse/OpenTelemetry、成本/延迟优化、评估 evals、guardrails)
- GitHub 产出:`ai-lab/` 仓库:RAG demo、agent demo、中文实验笔记

## Phase 11(Day 323–365 · Week 47–52):AI 全栈 Capstone + 系统设计综合复盘

- Week 47–49:AI 全栈项目 — 把 LLM 能力做进一个完整产品(如 AI 知识库问答 SaaS:NestJS + pgvector + RAG + 流式响应 + 订阅计费,前端仍是 Next.js 薄 UI);**AI 安全必做:prompt injection 防护、RAG 检索的租户权限过滤、PII 脱敏后再发给 LLM**,全程沿用 Capstone 1 的工程标准
- Week 50:系统设计综合周 — 每天一题,把 AI 系统纳入设计(如"设计一个支持 RAG 的企业搜索"),逐题自查 10 大概念覆盖度;并挑 2 道 Phase 6 的旧设计题按新认知重写,对比前后版本(原 Week 42 复盘内容并入此处)
- Week 51–52:全年复盘 — 整理 GitHub 成果墙、重构最有价值的两个仓库 README、**把填满的「后端概念跨语言对照表」整理成一篇独立的可迁移性总结(求职 .NET/Java 岗位时的秘密武器)**、写一篇中文年终技术总结(此时如有余力,可把核心 README 和总结翻成英文,直接进入求职冲刺)
- GitHub 产出:AI capstone 仓库、中文年度总结博客(可放 GitHub Pages)

---

## 每日任务执行规则(给每日 Agent)

1. 先读取 `progress.md`,确定当前学到第几天。**只按 Day N 计数,不使用具体日期**:用户不一定每天学习,今天的任务永远是「progress.md 中最大 Day N + 1」。
2. 给出当天具体任务:**按每天 1.5 小时设计**(学习 + 习题合计约 90 min)。
3. **当天任务必须汇总为一个 HTML 学习文档**:
   - 文件名为 `Day N - 学习主题.html`,放在 `docs/` 下以 `01-event-loop`、`02-streams` 这种编号-主题风格命名的文件夹中(一天一个文件夹);
   - HTML 文档必须有**目录、章节图标、结尾总结**,能清晰地学习知识、定位知识、复习知识;
   - 讲解语言**通俗易懂,把学员当成 10 岁新手程序员**,多用生活中的例子打比方(餐厅、快递、红绿灯等);
   - **生成课程时必须使用 ELI5 技能(`.claude/skills/eli5/SKILL.md`)**:每个新概念按「大白话 → 生活类比 → ⚠️ 类比边界 → 真实术语 → 先预测再运行的实验」五步讲,主线比喻(餐厅)跨天沿用;
   - 该 HTML 本身就是当天的 GitHub 可见产出。
4. **每天的习题代码写入 `src/` 文件夹**(按天建子目录,如 `src/01-event-loop/`);**从 Week 2 起,后端习题写进持续生长的 NestJS 项目 `nest-lab/`**(每天一个 commit,讲义里写清改了哪些文件),PostgreSQL 实验 SQL 放在 `nest-lab/sql/` 或当天的 `src/` 子目录;`src/` 只放一次性的机制小实验。
5. 给出具体的 git 操作指引(若本地有 git/gh 环境且用户已配置,可直接协助提交;否则给出可复制命令)。
6. 任务与产出语言:**全程中文**,语气简洁、教练式,不寒暄;技术术语保留英文原文(如 event loop、middleware、transaction);代码中的变量名、函数名维持英文惯例,注释用中文写。
7. **概念先行,语言为器(最高优先级)**:讲解时先讲语言无关的通用概念,**后端主题用 NestJS 举例、数据库主题用 PostgreSQL 举例**(按顶部「教学模板」的三步走:Nest/PG 里写出来 → 掀开盖子讲通用原理 → 跨语言对照;后端习题写进持续生长的 `nest-lab/` 项目);确保所学概念换成 C#/.NET、Java、Go 同样成立。**重点投入领域:后端机制、架构设计、系统设计、网络、数据库、高并发、流量分发;不深挖教具语言本身的边角语法/生态细节**(语言专题留到确定工作方向后再学)。产出笔记必须包含「概念卡」(通用定义)和「跨语言对照」(该概念在 .NET / Java / Go 里的对应物),并持续更新 roadmap 顶部的对照表。
8. 在 `progress.md` 的表格中追加一行:Day N、Phase/Week、任务摘要、GitHub 产出、状态(待完成/已完成)。**不要写具体日期列**。
9. 涉及 10 大 System Design 概念的周次,任务中必须显式标注对应概念编号(如「概念 #2 Caching」),并要求产出 cheat sheet 或最小实现。
