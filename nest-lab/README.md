# nest-lab · 365 计划持续生长的 NestJS 项目

一个「任务管理服务」。从 Week 2 起,所有后端习题都写进这个项目,每周往里加一层能力:
管线 → API → PostgreSQL → 缓存 → 认证 → 测试 → 限流 → 架构 → 容器 → K8s → 安全 → 实时 → MQ。

- 生成方式:`npx @nestjs/cli@latest new nest-lab --package-manager npm --skip-git --strict`(NestJS 12,ESM,测试用 vitest,lint 用 oxlint)
- `.npmrc` 里的 `legacy-peer-deps=true` 是为了绕过 npm 10 在模板依赖上的一个 peer 解析崩溃,原因写在文件注释里

## 常用命令

```bash
npm install            # 第一次 clone 后
npm run start:dev      # 开发模式(改代码自动重启),默认 http://localhost:3000
npm run build          # 编译到 dist/
npm run lint
npm test               # 单元测试(src/**/*.spec.ts)
npm run test:e2e       # e2e 测试(test/**/*.e2e-spec.ts,supertest 发真实 HTTP 请求)
npm run day08          # Day 8 观察脚本:看装饰器标签 + 一个请求流过哪些站
npm run day09          # Day 9 观察脚本:IoC 容器的元数据 + 三种作用域各造了几个实例
```

## 成长日志

| Day | 新增 / 修改 | 讲义 |
|---|---|---|
| Day 8 | `nest new` 起项目;`src/tasks/`(Module + Controller + Service,内存数组);`src/common/request-logger.middleware.ts`;`main.ts` 挂全局 middleware;`test/tasks.e2e-spec.ts`;`scripts/day08-try.mjs` | `docs/08-nestjs-intro/` |
| Day 9 | 仓储抽成接口 + `TASKS_REPOSITORY` token(`useClass: InMemoryTasksRepository`);`src/common/clock.ts`(`CLOCK` + `useValue`);`TASKS_SEED`(`useFactory` + `inject`);`TasksService` 改用 `@Inject(token)`;`Task` 加 `createdAt`;`src/scope-demo/`(三种作用域实验,不挂进 AppModule);单元测试改用 `Test.createTestingModule` + `overrideProvider`;`test/scope-demo.e2e-spec.ts`;`scripts/day09-try.mjs` | `docs/09-di-ioc/` |
