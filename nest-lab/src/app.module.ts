import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { contentNegotiation } from './common/content-negotiation.middleware.js';
import { DemoKeyGuard } from './common/demo-key.guard.js';
import { RequestContextMiddleware } from './common/request-context/request-context.middleware.js';
import { RequestContextModule } from './common/request-context/request-context.module.js';
import { requestLogger } from './common/request-logger.middleware.js';
import { TimingInterceptor } from './common/timing.interceptor.js';
import { type Env, validateEnv } from './config/env.schema.js';
import { TasksModule } from './tasks/tasks.module.js';

// 根模块 = 总部:把各个部门(TasksModule……)登记进来,Nest 从这里开始顺藤摸瓜组装整个应用。
// Day 13:全局店规全部搬进来(都在 DI 容器里,都能注入依赖;e2e / 脚本只要 imports AppModule 就自动生效)
@Module({
  imports: [
    // Day 12:开店检查单。读 .env + process.env → validateEnv 逐项核对 → 不合格直接启动失败
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    RequestContextModule, // Day 13:请求上下文(ALS)
    TasksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Day 11:全局 guard(注入 Reflector、Day 12 起还注入 ConfigService)
    { provide: APP_GUARD, useClass: DemoKeyGuard },
    // Day 13:全局 interceptor / filter 也改成 DI 版(Day 10 是 app.useGlobalXxx(new X()),在容器外)
    { provide: APP_INTERCEPTOR, useClass: TimingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  constructor(private readonly config: ConfigService<Env, true>) {}

  // 模块级 middleware:按 apply() 的顺序执行。先发桌号牌,登记员打印时才看得到桌号
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
    // Day 12:LOG_REQUESTS=false 时不挂进出门日志
    if (this.config.get('LOG_REQUESTS', { infer: true })) {
      consumer.apply(requestLogger).forRoutes('*');
    }
    // Day 15:内容协商(406 / 415)。放在登记员之后,被拒的请求也有进出门日志
    consumer.apply(contentNegotiation).forRoutes('*');
  }
}
