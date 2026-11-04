import type { INestApplication } from '@nestjs/common';

// Day 10:全局店规曾经集中在这里(app.use / useGlobalInterceptors / useGlobalFilters)。
// Day 13:它们全部搬进了 AppModule(APP_INTERCEPTOR / APP_FILTER / configure() 里的 middleware),
// 原因:① 在 DI 容器里,能注入 ConfigService、RequestContextService;② e2e、脚本只要 imports AppModule 就自动生效。
// 这个函数暂时是空的,保留它是给「只能在 app 实例上做的事」留位置(例如 Week 3 的 swagger、Week 14 的 enableShutdownHooks)。
export function configureApp(app: INestApplication): INestApplication {
  return app;
}
