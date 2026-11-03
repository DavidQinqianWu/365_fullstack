import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

// Module = 一个部门的编制表:这个部门有哪些前台(controllers)、哪些后厨(providers)。
// Nest 启动时读这张表,把人招齐、把关系接好。
@Module({
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
