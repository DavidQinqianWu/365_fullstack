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
