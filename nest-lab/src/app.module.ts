import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DemoKeyGuard } from './common/demo-key.guard.js';
import { validateEnv } from './config/env.schema.js';
import { TasksModule } from './tasks/tasks.module.js';

// 根模块 = 总部:把各个部门(TasksModule……)登记进来,Nest 从这里开始顺藤摸瓜组装整个应用。
@Module({
  imports: [
    // Day 12:开店检查单。读 .env + process.env → validateEnv 逐项核对 → 不合格直接启动失败
    // isGlobal:任何模块都能注入 ConfigService,不用每个模块再 import
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TasksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Day 11:全局 guard 用 APP_GUARD 注册 —— 它是容器里的 Provider,能注入 Reflector。
    // (Day 10 的 app.useGlobalInterceptors(new X()) 在容器外,没法注入任何东西)
    // 因为写在 AppModule 里,e2e 测试、观察脚本只要 imports AppModule 就自动生效。
    { provide: APP_GUARD, useClass: DemoKeyGuard },
  ],
})
export class AppModule {}
