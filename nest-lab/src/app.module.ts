import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TasksModule } from './tasks/tasks.module.js';

// 根模块 = 总部:把各个部门(TasksModule……)登记进来,Nest 从这里开始顺藤摸瓜组装整个应用。
@Module({
  imports: [TasksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
