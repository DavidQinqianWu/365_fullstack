# nest-lab · 365 计划持续生长的 NestJS 项目

一个「任务管理服务」。从 Week 2 起,所有后端习题都写进这个项目,每周往里加一层能力:
管线 → API → PostgreSQL → 缓存 → 认证 → 测试 → 限流 → 架构 → 容器 → K8s → 安全 → 实时 → MQ。

- 生成方式:`npx @nestjs/cli@latest new nest-lab --package-manager npm --skip-git --strict`(NestJS 12,ESM,测试用 vitest,lint 用 oxlint)
- `.npmrc` 里的 `legacy-peer-deps=true` 是为了绕过 npm 10 在模板依赖上的一个 peer 解析崩溃,原因写在文件注释里

## 常用命令

```bash
npm install            # 第一次 clone 后
cp .env.example .env   # 可选:本地配置(.env 不进 git;不建也能跑,全部有默认值)
npm run start:dev      # 开发模式(改代码自动重启),默认 http://localhost:3000
npm run build          # 编译到 dist/
npm run lint
npm test               # 单元测试(src/**/*.spec.ts)
npm run test:e2e       # e2e 测试(test/**/*.e2e-spec.ts,supertest 发真实 HTTP 请求)
npm run day08          # Day 8 观察脚本:看装饰器标签 + 一个请求流过哪些站
npm run day09          # Day 9 观察脚本:IoC 容器的元数据 + 三种作用域各造了几个实例
npm run day10          # Day 10 观察脚本:一个请求在 AOP 管线里走过哪些站、在哪一站停下
npm run day11          # Day 11 观察脚本:标签什么时候贴、Reflector 怎么读、拼错 key 静默失效
npm run day12          # Day 12 观察脚本:env 写错时拒绝启动、写对时类型正确、钥匙来自配置
npm run day13          # Day 13 观察脚本:并发请求的日志按 requestId 归组 + 单例字段串号反例
npm run day15          # Day 15 观察脚本:每个 HTTP 方法的状态码与响应头、PUT vs PATCH、POST 重复提交、405/406/415
npm run day16          # Day 16 观察脚本:DTO 校验的合法 / 非法请求、transform、whitelist、class-validator vs zod
npm run day17          # Day 17 观察脚本:12 种错误统一成 problem+json,自动校验结构
npm run day18          # Day 18 观察脚本:内部对象 / 黑名单 / 白名单 / 显式映射,新增敏感字段后谁泄露
npm run day19          # Day 19 观察脚本:offset vs cursor 翻页、过滤排序与非法参数、v1 vs v2、忘了 configureApp
npm run day20          # Day 20 观察脚本:拉取 OpenAPI、列接口清单、自动检查契约、生成前端 TS 类型、生产环境不开放文档
npm run day22          # Day 22 观察脚本:检查 PG 是否在线、每个连接一个后端进程、跑 sql/day22/ 下的 CRUD 实验(需要先启动 PostgreSQL)
npm run day23          # Day 23 观察脚本:宽表的三类异常 → 1NF / 2NF / 3NF 逐级拆解 → JOIN 拼回 → 计数缓存失真(schema day23,需要 PostgreSQL)
npm run day24          # Day 24 观察脚本:serial / IDENTITY、integer 用完、UUID v4 vs v7、约束与 SQLSTATE、ON DELETE、并发注册(schema day24,需要 PostgreSQL)
npm run day25          # Day 25 观察脚本:JOIN 全家、EXISTS / NOT EXISTS / NOT IN 遇 NULL、扇出、GROUP BY / HAVING / FILTER、CTE 与递归、NULL 三值逻辑(schema day25)
npm run day26          # Day 26 观察脚本:窗口函数与每组最新、UPSERT 与并发注册、RETURNING、JSONB、数组、timestamptz 与夏令时、枚举(schema day26)
npm run day27          # Day 27 观察脚本:连接池、SQL 注入对比、PG 版 CRUD、事务回滚、keyset 真实 SQL、约束 → problem+json、fail fast(需要 PostgreSQL)
npm run day29          # Day 29 观察脚本:百万行 tasks 上没有索引 vs 有索引、ctid、B-tree 树高、选择性导致不用索引(schema day29,需要 PostgreSQL)
npm run day30          # Day 30 观察脚本:读计划树、BUFFERS 冷热、Index Only / Bitmap(lossy)、排序与 work_mem、三种 JOIN、统计信息过期与 ANALYZE(schema day30)
npm run day31          # Day 31 观察脚本:最左前缀、列顺序、复合 vs 两个单列、WHERE + ORDER BY + LIMIT、keyset 的行值比较 vs OR 展开、INCLUDE 与 visibility map(schema day31)
npm run day32          # Day 32 观察脚本:部分索引与参数化查询、部分唯一索引、表达式索引与 IMMUTABLE、外键列的索引、0/1/3/6 个索引的写放大与 WAL、HOT 更新、没用的 / 重复的索引(schema day32)
npm run day33          # Day 33 观察脚本:B-tree 与 LIKE / 排序规则、pg_trgm + GIN(中英文子串、模糊匹配、btree_gin)、全文搜索、JSONB / 数组的 GIN、GIN 的写入代价、BRIN 与数据顺序(schema day33;会 CREATE EXTENSION pg_trgm / btree_gin)
npm run day34          # Day 34 观察脚本(约 30 秒;-- --quick 约 25 秒):灌 30 万任务 → 热点查询优化前后的计划 → offset vs keyset → 加负载前后的 pg_stat_statements(会重建 schema app)
npm run day36          # Day 36 观察脚本(约 10 秒):原子性、可延迟外键、隔离性最小演示、WAL 与 synchronous_commit、aborted 状态、DDL 回滚、transaction() 修复前后(schema day36);sudo … -- --crash 真的崩溃一次(只限本机 PostgreSQL)
npm run day37          # Day 37 观察脚本(约 4 秒):两个连接按固定时序复现脏读 / 不可重复读 / 幻读 / 丢失更新 / 写偏斜 × RU / RC / RR / SER,自动判定并汇总;用 src/database/with-retry.ts(Day 40 从仓库根目录搬进来;脚本先 nest build)演示 40001 后整个事务重做(schema day37)
npm run day38          # Day 38 观察脚本(约 50 秒):xmin / xmax / ctid、pageinspect(root 运行时用 postgres 执行)、快照与两个版本、读写互不阻塞、表膨胀与 VACUUM / VACUUM FULL、长事务挡住清理、冻结、等 autovacuum 自己来(schema day38)
npm run day39          # Day 39 观察脚本(约 10 秒):行锁 / NOWAIT / lock_timeout / 外键检查的锁、SKIP LOCKED 队列(4 worker × 200 任务)、DDL 锁队列与 lock_timeout 重试、死锁与按顺序加锁、pg_blocking_pids、咨询锁(schema day39)
npm run day40          # Day 40 观察脚本(约 7 秒):纯 SQL 的丢失更新与 UPDATE … AND version = $n、FOR NO KEY UPDATE 排队并读到最新值;nest-lab 真实代码的修之前 / 乐观锁 / 悲观锁:绕过 409 规则、跨请求的丢失更新、热点行 50 并发的代价、内存仓储也会被插队(schema day40、day40_app)
npm run db:reset       # 用 psql 重建 schema app(sql/schema.sql + sql/seed.sql);-- --schema app_test 重建测试用的 schema
npm run db:seed:big    # Day 34:重建 schema app 并灌 30 万任务 + 24 万清单项(sql/seed-big.sql);拒绝对 app_test 执行
npm run load           # Day 34:启动 PG 版 nest-lab,8 个并发打 15 种请求 10 秒,按请求类型统计 p50 / p95(-- --seconds 5 --concurrency 4)
npm run test:e2e:pg    # 同一套 e2e,换成 PostgreSQL 版仓储再跑一遍(先自动重建 app_test)
npm run openapi:generate  # 改了接口后重新生成 openapi.json(和代码一起提交)
npm run openapi:check     # openapi.json 是否和代码一致(过期 → 退出码 1,给 CI 用)
```

## API 文档(Day 20)

- 设计约定(语言无关):[`docs/api-design.md`](docs/api-design.md)
- 机器可读契约:[`openapi.json`](openapi.json)(OpenAPI 3.0,code-first,由代码生成,不要手改)
- 启动后打开 `http://localhost:3000/docs`(Swagger UI)或 `/docs-json`(JSON)
- 开关:环境变量 `SWAGGER_ENABLED`;不设时 `NODE_ENV=production` 默认关闭,其他环境默认打开
- 前端生成类型:`npx openapi-typescript openapi.json -o api.d.ts`

## 响应格式

成功响应的响应体就是资源本身(Day 18 起去掉了 `{ data, timestamp }` 包装),字段由各模块 `dto/*-response.ts` 里的显式映射函数决定;错误响应见下一节。

集合响应(Day 19)是一页资源 `{ items, nextCursor }`:cursor 分页,`limit` 默认 20、最大 100(超过回 422),`sort` / 过滤字段有白名单,不返回 total。

版本化(Day 19):URI 版本 `/v2/tasks`;不带版本的 `/tasks` 指向 v2;`/v1/tasks` 是 Day 10–17 的旧格式,已弃用(响应头 `Deprecation` / `Sunset` / `Link`),计划 2027-05-01 下线。

## 数据库(Week 4 起)

本地开发用 PostgreSQL 16(Day 22 起)。Day 27 起任务数据可以存进 PostgreSQL:`.env` 里设 `TASKS_STORAGE=postgres` 和 `DATABASE_URL`,先 `npm run db:reset` 建表(Docker 下没有本机 psql 时:`docker compose exec -T postgres psql -U nest_lab -d nest_lab -v schema=app -f /sql/schema.sql -f /sql/seed.sql`)。默认 `TASKS_STORAGE=memory`,测试和 day08–day20 的观察脚本不需要数据库:

```bash
cp .env.example .env             # POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB / POSTGRES_PORT
docker compose up -d             # compose.yaml:postgres:16 + 数据卷 + pg_isready 健康检查
docker compose ps                # 显示 (healthy) 再连
docker compose exec postgres psql -U nest_lab -d nest_lab
psql postgresql://nest_lab:nest_lab_dev@localhost:5432/nest_lab   # 本机装了 psql 时也可以直接连
```

- 没有 Docker:本机安装 PostgreSQL 16,再用超级用户建角色和库(步骤见 Day 22 讲义)
- 每天的 SQL 实验在 `sql/dayNN/`:本机 psql 在 nest-lab 目录下 `\i sql/day22/01-create.sql`(或 `psql -f`);容器里的 psql 用挂进去的路径 `\i /sql/day22/01-create.sql`
- 数据模型(ER 图 + 主键与约束 + 约束违反→状态码的约定 + checklist / 标签 / 时间的存储决定):[`docs/er-diagram.md`](docs/er-diagram.md)
- `compose.yaml` 按标准写法编写,未在课程验证环境实测(那里没有 Docker);SQL 部分均在 PostgreSQL 16.15 实测

## 错误格式

所有错误响应都是 RFC 9457 problem+json,错误类型目录见 [`docs/problems.md`](docs/problems.md)。

## 成长日志

| Day | 新增 / 修改 | 讲义 |
|---|---|---|
| Day 8 | `nest new` 起项目;`src/tasks/`(Module + Controller + Service,内存数组);`src/common/request-logger.middleware.ts`;`main.ts` 挂全局 middleware;`test/tasks.e2e-spec.ts`;`scripts/day08-try.mjs` | `docs/08-nestjs-intro/` |
| Day 9 | 仓储抽成接口 + `TASKS_REPOSITORY` token(`useClass: InMemoryTasksRepository`);`src/common/clock.ts`(`CLOCK` + `useValue`);`TASKS_SEED`(`useFactory` + `inject`);`TasksService` 改用 `@Inject(token)`;`Task` 加 `createdAt`;`src/scope-demo/`(三种作用域实验,不挂进 AppModule);单元测试改用 `Test.createTestingModule` + `overrideProvider`;`test/scope-demo.e2e-spec.ts`;`scripts/day09-try.mjs` | `docs/09-di-ioc/` |
| Day 10 | `src/common/` 新增计时 / 包装 interceptor、`DemoKeyGuard`、`TracedParseIntPipe`、`AllExceptionsFilter`;`src/app.setup.ts`(`configureApp`:全局 middleware + interceptor + filter,main.ts / e2e / 脚本共用);`TasksController` 挂 Controller 级 interceptor、POST 级 guard、`:id` 参数 pipe;响应改为 `{ data, timestamp }`,`POST /tasks` 需要请求头 `x-demo-key: let-me-in`;新增 2 个单元测试文件,e2e 补 403 / 400 / 响应头;`scripts/day10-try.mjs` | `docs/10-aop/` |
| Day 11 | `src/common/decorators/`(`@Public()` = SetMetadata、`@Roles()` = `Reflector.createDecorator`、`@RequestId()` = createParamDecorator、`@AdminOnly()` = applyDecorators);`DemoKeyGuard` 升级为全局默认要钥匙(`APP_GUARD`,读 `@Public()`);新增 `RolesGuard`(角色暂读 `x-demo-role`);`DELETE /tasks/:id`(`@AdminOnly()`);GET 接口、首页、scope-demo 贴 `@Public()`;`src/decorator-demo/`(覆盖 / 合并 / 拼错 key 演示);测试补齐;`scripts/day11-try.mjs` | `docs/11-custom-decorators/` |
| Day 12 | 依赖 `@nestjs/config` + `zod`;`src/config/env.schema.ts`(zod 开店检查单:`z.coerce.number` / `z.stringbool` / 生产环境禁用默认钥匙,`z.infer` 推导 `Env`);`ConfigModule.forRoot({ validate })`;`DemoKeyGuard` 从 `ConfigService<Env, true>` 读 `DEMO_KEY`;`main.ts` 读 `PORT`;`LOG_REQUESTS` 开关进出门日志;`src/common/typed-token.ts`(带类型的 token + `valueProvider` / `classProvider`);`.env.example`;vitest 配置里固定测试用 env;`scripts/day12-try.mjs` | `docs/12-typescript-server/` |
| Day 13 | `src/common/request-context/`(AsyncLocalStorage + `RequestContextService` + `RequestContextMiddleware` 读取 / 生成 / 回写 `x-request-id` + `ctxLog` 带桌号日志);全部站点日志改用 `ctxLog`;`@RequestId()` 改读 ALS;全局 interceptor / filter 改为 `APP_INTERCEPTOR` / `APP_FILTER`(注入 `RequestContextService`,错误体带 `requestId`);middleware 改在 `AppModule.configure()` 注册,`configureApp` 变为空壳;`src/request-context-demo/`(并发厨房 + 单例字段反例);测试补齐;`scripts/day13-try.mjs` | `docs/13-request-context/` |
| Day 15 | 任务接口按 REST 整理:`PUT /tasks/:id`(整体替换)、`PATCH /tasks/:id`(部分更新)、`POST` 回 201 + `Location`、`DELETE` 回 204;409 规则(已完成的任务不能改标题);兜底路由实现 405 + `Allow` 与 `OPTIONS`;`src/common/content-negotiation.middleware.ts`(406 / 415);`src/tasks/task-input.ts` 手写最小输入检查(Day 16 换 DTO);仓储加 `update()`;`test/rest.e2e-spec.ts`;`scripts/day15-try.mjs` | `docs/15-http-rest/` |
| Day 16 | 依赖 `class-validator` / `class-transformer` / `@nestjs/mapped-types`;`src/tasks/dto/`(`ReplaceTaskDto` + `CreateTaskDto = PickType` + `UpdateTaskDto = PartialType` + 嵌套 `ChecklistItemDto`;zod 对照版 `task.zod.ts`);`src/common/validation/`(`@IsNotBlank` 自定义校验器、全局选项、`ZodValidationPipe`);全局 `ValidationPipe` 用 `APP_PIPE` 注册(whitelist + forbidNonWhitelisted + transform,校验失败 422);`Task` 加 `checklist`;删除 Day 15 的 `task-input.ts`;filter 透出字段错误列表;`test/validation.e2e-spec.ts`;`scripts/day16-try.mjs` | `docs/16-dto-validation/` |
| Day 17 | `src/common/problems/`(错误类型目录 `ProblemTypes`、`ProblemException`、ValidationPipe 的 `exceptionFactory` 输出 JSON Pointer 字段级 `errors`);`AllExceptionsFilter` 改写为 `application/problem+json`(500 不泄露细节,真实原因进日志);JSON 语法错误时 filter 兜底补发 requestId;409 改用 `ProblemTypes.taskCompleted`;zod 对照 pipe 同步输出 problem;`docs/problems.md` 错误目录;`src/problem-demo/`(500 演示);`test/problem.e2e-spec.ts`;`scripts/day17-try.mjs` | `docs/17-problem-json/` |
| Day 18 | 新增 `src/users/`(内存仓储 + token,`passwordHash` 用 scrypt,`CreateUserDto`,显式映射 `toUserResponse`:email 打码、admin 视图多 `internalNote`);任务也改为 `toTaskResponse` 映射;删除 `WrapResponseInterceptor`,成功响应不再包装;`src/serialization-demo/`(`ClassSerializerInterceptor` 黑名单 / 白名单 / groups / 普通对象失效对照);`test/users.e2e-spec.ts`;`scripts/day18-try.mjs` | `docs/18-response-dto/` |
| Day 19 | 任务列表改为 cursor 分页 `{ items, nextCursor }`(`ListTasksQueryDto`:limit 1–100、`done` / `q` 过滤、`sort` 白名单;`cursor.ts` 不透明书签;仓储 `findPage()` 对应 WHERE / ORDER BY / LIMIT / keyset);offset 分页只在仓储层实现做对比;URI 版本化(`configureApp` 里 `enableVersioning`,`src/app.factory.ts` 的 `createApp()` 统一入口,所有 e2e 调用 `configureApp`);`TasksV1Controller`(旧格式 + `@DeprecatedApi` 的 Deprecation / Sunset / Link 头);新增 `invalid-cursor` 错误类型;`test/pagination.e2e-spec.ts`;`scripts/day19-try.mjs` | `docs/19-pagination-versioning/` |
| Day 20 | 依赖 `@nestjs/swagger`(去掉直接依赖 `@nestjs/mapped-types`,`PickType` / `PartialType` 改从 swagger 导入)、dev 依赖 `openapi-typescript`;`src/openapi.ts`(`DocumentBuilder` + `SwaggerModule`,只收录 tasks / users,operationId 规则,无版本别名路径不重复登记);`configureApp` 按 `SWAGGER_ENABLED` 挂 `/docs` 与 `/docs-json`(env schema 新增该项,生产默认关);DTO 全部显式 `@ApiProperty`(不用 CLI 插件:vitest 下插件不生效);响应 `interface` 改为 class(`TaskResponse` / `UserResponse` / `TaskPage`,既是映射函数返回类型又是 schema);`src/common/problems/problem.schema.ts`(`ProblemDetailsDto` / `ValidationProblemDto` + `@ApiProblemResponses()`);各控制器 `@ApiTags` / `@ApiOperation` / `@ApiResponse` / `@ApiSecurity` / `@ApiHeader`,v1 标 `deprecated`;`openapi.json` + `scripts/openapi.mjs`(generate / check);`docs/api-design.md`;`test/openapi.e2e-spec.ts`;`scripts/day20-try.mjs` | `docs/20-openapi/` |
| Day 22 | `compose.yaml`(`postgres:16`,用户 / 密码 / 库名从 `.env` 读,具名数据卷,`pg_isready` 健康检查,只绑定 127.0.0.1);`.env.example` 新增 `POSTGRES_*`;`sql/day22/`(建表、CRUD 对应 HTTP 方法、忘写 WHERE 用 `BEGIN … ROLLBACK` 兜底、没有 ORDER BY 就没有顺序、`EXPLAIN` 看一眼、没有 BEGIN 时 ROLLBACK 无效);`scripts/day22-try.mjs`(用 `node:child_process` 调 psql,没有数据库时给出提示并退出);应用代码未改 | `docs/22-postgres-intro/` |
| Day 23 | `sql/day23/`(独立 schema `day23`:宽表与更新 / 插入 / 删除异常、1NF → 2NF → 3NF 逐级拆表并用 `INSERT … SELECT` 搬数据、`JOIN` 拼回原视图、`tasks_count` 计数缓存失真与校正);`docs/er-diagram.md`(mermaid `erDiagram`:users / tasks / checklist_items / tags / task_tags,表 ≠ API 资源对照);`scripts/day23-try.mjs`;应用代码未改 | `docs/23-data-modeling/` |
| Day 24 | `sql/day24/`(schema `day24`:serial vs `GENERATED ALWAYS / BY DEFAULT AS IDENTITY`、回滚后序列不回退、integer 上限、UUID v4 vs v7 与 PG 16 下的 `uuid_v7()` SQL 函数、20 万行插入与主键索引大小对比、带命名约束的 3NF 表(NOT NULL / UNIQUE / `lower(email)` 唯一索引 / CHECK / 外键 `ON DELETE`)、四种 SQLSTATE、并发「先查后插」);`docs/er-diagram.md` 补上主键与约束和 SQLSTATE → 状态码约定;`scripts/day24-try.mjs`;应用代码未改 | `docs/24-keys-constraints/` |
| Day 25 | `sql/day25/`(schema `day25`:Day 24 的 3NF 表 + 没有任务的 Carol、没有标签的任务、`estimate_minutes`、`employees` 自引用表;INNER / LEFT(条件放 ON vs WHERE)/ RIGHT / CROSS / 自连接、EXISTS / NOT EXISTS / NOT IN 遇 NULL、扇出重复计算与两种修法、COUNT / GROUP BY / HAVING / FILTER / string_agg、子查询 / CTE / 递归 CTE、NULL 三值逻辑与逻辑执行顺序);`scripts/day25-try.mjs`;应用代码未改 | `docs/25-sql-queries-1/` |
| Day 26 | `sql/day26/`(schema `day26`:窗口函数 `row_number / rank / dense_rank / lag / lead`、累计和与移动平均、每组最新的三种写法(`row_number`、`DISTINCT ON`、`LATERAL`)、`INSERT … ON CONFLICT DO NOTHING / DO UPDATE` 与并发注册、`RETURNING`、JSONB 操作符与「便条不校验」、数组 vs 中间表、`timestamptz` vs `timestamp` 与柏林夏令时、ENUM);`docs/er-diagram.md` 新增「存储形式的决定」(checklist 用子表);`scripts/day26-try.mjs`;应用代码未改 | `docs/26-sql-queries-2/` |
| Day 27 | 依赖 `pg` + `@types/pg`;`src/database/`(`PG_POOL` 带类型 token + `useFactory` 建连接池、`onModuleDestroy` 关池、`pg-errors.ts` 把 SQLSTATE 翻译成 problem+json);`src/tasks/pg-tasks.repository.ts`(参数化查询、两张表写入用事务、`json_agg` 拼 checklist、keyset 行值比较 / OR 展开、ORDER BY 白名单、`COLLATE "C"`);仓储接口改为 async(Service / Controller 跟着 await);`TasksModule` 按 `TASKS_STORAGE` 选实现;env schema 新增 `TASKS_STORAGE` / `DATABASE_URL` / `DATABASE_SCHEMA` / `DB_POOL_MAX` / `DB_RESET_ON_START`;`sql/schema.sql`、`sql/seed.sql`、`scripts/db-reset.mjs`、`vitest.config.e2e.pg.ts`;`src/db-demo/`(SQL 注入对比等实验接口,不在 AppModule 里);`sql/day27/`;`scripts/day27-try.mjs` | `docs/27-nest-postgres/` |
| Day 29 | `sql/day29/`(schema `day29`:`generate_series` 造 100 万行 tasks(owner 分布不均、90% 已完成)、无索引时的 Seq Scan、`ctid`、主键 / 普通 B-tree 索引、建索引前后的 EXPLAIN 与执行时间、选择性(`done = true` 走全表扫描、小表不用索引)、`pageinspect` 看树高);`scripts/day29-try.mjs`;应用代码未改 | `docs/29-indexes-btree/` |
| Day 30 | `sql/day30/`(schema `day30`:100 万 tasks + 1 万 users;`EXPLAIN (ANALYZE, BUFFERS)` 读计划树、shared hit vs read、Index Only Scan / Bitmap 精确与 lossy、Sort 溢出到磁盘与 top-N、Nested Loop / Hash / Merge 三种 JOIN 与 `enable_*` 对照、关闭 autovacuum 制造统计过期与 `ANALYZE` 修复、`CREATE STATISTICS`、`EXPLAIN ANALYZE` 真的执行 DELETE);`scripts/day30-try.mjs`;应用代码未改 | `docs/30-explain-plans/` |
| Day 31 | `sql/day31/`(schema `day31`:复合索引与最左前缀、等值在前范围在后、BitmapAnd vs 复合索引、`(owner_id, created_at DESC, id DESC)` 让 WHERE + ORDER BY + LIMIT 不再排序、混合方向与 Incremental Sort、keyset 行值比较 vs OR 展开(补一个冗余范围条件后从约 100 ms 到 0.1 ms 以内)、`INCLUDE` 覆盖索引、UPDATE 后 Heap Fetches 上升与 VACUUM 归零);`scripts/day31-try.mjs`;应用代码未改(nest-lab 的索引清单写在讲义里,Day 34 落地) | `docs/31-composite-covering-indexes/` |
| Day 32 | `sql/day32/`(schema `day32`:`WHERE done = false` 部分索引 2208 kB vs 完整索引 30 MB,通用计划里的 `done = $1` 用不上;部分唯一索引(每人一个进行中的计时、软删除后邮箱可重新注册);`lower(email)` 表达式索引与 `ILIKE`;`created_at::date` 因非 IMMUTABLE 报错及写法;外键列无索引时删一个会员约 30–60 ms、有索引不到 1 ms,以及找出无索引外键的查询;0/1/3/6 个索引的 INSERT / UPDATE 耗时与 WAL;fillfactor 与 HOT;`pg_stat_user_indexes` 找没用的 / 重复的索引);`scripts/day32-try.mjs`;应用代码与 `schema.sql` 未改 | `docs/32-partial-expression-indexes/` |
| Day 33 | `sql/day33/`(schema `day33`:C.UTF-8 下普通 B-tree 用不上前缀 LIKE,要 `text_pattern_ops` / `COLLATE "C"`;trigram GIN 让 `ILIKE '%urgent%'` 从约 500 ms 到几 ms,中文 3 个字符以上可用、2 个字不行;全文搜索的词干与中文不分词;`tags @>`、`jsonb_ops` vs `jsonb_path_ops`;GIN 写入代价与 `fastupdate`;BRIN 24 kB vs B-tree 21 MB、打乱后失效);`scripts/day33-try.mjs`;应用代码与 `schema.sql` 未改(`?q=` 的方案写在讲义里,Day 34 落地) | `docs/33-gin-brin/` |
| Day 34 | 实战调优:`pg_stat_statements` 找总耗时最多的语句;`sql/schema.sql` 新增 `pg_trgm` 扩展、`(created_at, id)`、`(title COLLATE "C", id)`、trigram GIN 三个索引和 `title` 的 `SET STATISTICS 1000`;修复 `keysetCondition` 混合方向深分页(冗余范围条件,`src/tasks/pg-tasks.repository.ts` + 新单元测试 + 新 e2e);`sql/seed-big.sql` + `npm run db:seed:big`、`scripts/load-tasks.mjs` + `npm run load`、`sql/day34/`、`scripts/day34-try.mjs`;`compose.yaml` 预加载 pg_stat_statements(未实测);报告见 `docs/query-tuning.md` | `docs/34-query-tuning/` |
| Day 36 | `sql/day36/`(schema `day36`:不用事务的转账让合计从 150 变 280、事务里出错后的 aborted(`25P02`)、SAVEPOINT、序列不回滚、`DEFERRABLE INITIALLY DEFERRED` 外键到 COMMIT 才检查、两个连接的隔离性最小演示、一次提交写 232 字节 WAL、`synchronous_commit` on/off、`kill -9` 后崩溃恢复、DDL 回滚、`now()` vs `clock_timestamp()`);**修复 `PgTasksRepository.transaction()`**:ROLLBACK 失败时原错误优先抛出、`release(err)` 丢弃连接,新增 5 个单元测试;`scripts/day36-try.mjs` | `docs/36-transactions-acid/` |
| Day 37 | `sql/day37/`(schema `day37`:脏读在 PG 任何级别都复现不出(RU = RC);RC 下不可重复读、幻读、丢失更新、写偏斜都会静默发生,`SET n = n + 1` 不丢;RR 下前两种消失、丢失更新报 `40001 could not serialize access due to concurrent update`、写偏斜照样发生;SER 下写偏斜在提交时报 `40001 … read/write dependencies among transactions`);`scripts/day37-try.mjs`;重试辅助函数在仓库根目录的 `src/37-isolation-levels/with-retry.ts`(不进 nest-lab 的 src,Day 40 再决定方案);应用代码未改 | `docs/37-isolation-levels/` |
| Day 38 | `sql/day38/`(schema `day38`:UPDATE 写新版本(ctid (0,1)→(0,4))、回滚的更新留下 xmax 和一个永远不可见的新版本;两个连接看到同一行的两个版本、读写互不等待;20 万行全表更新 3 遍 16 MB → 64 MB,VACUUM 后不缩但可复用、Heap Fetches 归零,VACUUM FULL 回到 16 MB;`av_demo` 按表调小阈值后 autovacuum 自己出现;RR 只读或写过的空闲事务让 `10000 are dead but not yet removable`,RC 只读的不会;冻结与 `age(datfrozenxid)`);`scripts/day38-try.mjs`;应用代码未改 | `docs/38-mvcc-vacuum/` |
| Day 39 | `sql/day39/`(schema `day39`:FOR UPDATE 不挡读、xmax 记着锁、`55P03` NOWAIT / lock timeout;UPDATE 的 FOR NO KEY UPDATE 不挡外键检查;SKIP LOCKED 队列 4 个 worker 各 50 个、每个任务恰好一次、约 380 ms,不加 SKIP LOCKED 约 1460 ms;等锁的 ALTER TABLE 让普通 SELECT 超时,lock_timeout 200ms + 重试第 4 次成功;`40P01 deadlock detected` 与按 id 顺序 FOR UPDATE;`06-who-blocks.sql` 查谁挡住了谁;咨询锁 3 个连接只有 1 个拿到);`scripts/day39-try.mjs`;应用代码未改 | `docs/39-locks/` |
| Day 40 | 乐观锁 vs 悲观锁:`tasks` 加 `version integer NOT NULL DEFAULT 1`;`TasksService` 的 PUT / PATCH 改成「读 → 判断 409 规则 → `UPDATE … WHERE id = $1 AND version = $2`」,0 行再查一次区分 404 / 409;请求体可选 `version`(过时 → 新的 `409 conflict/stale-version`),不带时服务器整轮重做(最多 3 次);响应新增 `version`;仓储新增悲观锁版本 `updateLocked`(`SELECT … FOR NO KEY UPDATE`);内存仓储改为交出复印件;`withRetry` 搬进 `src/database/`(+ 单元测试),day37 改用它;`test/concurrency.e2e-spec.ts`(内存 / PG 都跑,修之前 PG 上 4 个失败);`sql/day40/`、`scripts/day40-try.mjs`(修之前 20/20 次写出「已完成却被改名」,乐观锁 / 悲观锁 0/20;热点行 50 并发 +1:修之前只加了 1,乐观锁约 450–680 ms、重做 410–460 次,悲观锁约 130–320 ms)| `docs/40-optimistic-pessimistic/` |
