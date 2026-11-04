import { Module } from '@nestjs/common';
import { CLOCK, systemClock, type Clock } from '../common/clock.js';
import { InMemoryTasksRepository } from './in-memory-tasks.repository.js';
import type { Task } from './task.js';
import { TasksController } from './tasks.controller.js';
import { TASKS_REPOSITORY, TASKS_SEED } from './tasks.repository.js';
import { TasksService } from './tasks.service.js';

// Module = 一个部门的编制表。Day 9 起它还是「人事部的登记簿」:
// 每一行都在说「有人要 X 这个 token 时,怎么造出来」。
@Module({
  controllers: [TasksController],
  providers: [
    // 简写:等于 { provide: TasksService, useClass: TasksService },类本身就是 token
    TasksService,

    // useClass:要「仓储」时,用内存实现来造。Week 4 换 PostgreSQL 只改这一行。
    { provide: TASKS_REPOSITORY, useClass: InMemoryTasksRepository },

    // useValue:现成的对象直接放进去,不用造
    { provide: CLOCK, useValue: systemClock },

    // useFactory + inject:先把 CLOCK 造好传给工厂函数,再用它的返回值当 provider
    {
      provide: TASKS_SEED,
      useFactory: (clock: Clock): Task[] => {
        const openedAt = clock.now().toISOString(); // 开业时间
        return [
          { id: 1, title: '跑通 nest new', done: true, createdAt: openedAt },
          { id: 2, title: '看懂 Module / Controller / Provider', done: false, createdAt: openedAt },
        ];
      },
      inject: [CLOCK],
    },
  ],
})
export class TasksModule {}
