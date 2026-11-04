import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type pg from 'pg';
import { CLOCK, systemClock, type Clock } from '../common/clock.js';
import { valueProvider } from '../common/typed-token.js';
import type { Env } from '../config/env.schema.js';
import { DatabaseModule } from '../database/database.module.js';
import { PG_POOL } from '../database/pg-pool.js';
import { InMemoryTasksRepository } from './in-memory-tasks.repository.js';
import { PgTasksRepository } from './pg-tasks.repository.js';
import type { Task } from './task.js';
import { TasksController } from './tasks.controller.js';
import { TasksV1Controller } from './v1/tasks-v1.controller.js';
import { TASKS_REPOSITORY, TASKS_SEED, type TasksRepository } from './tasks.repository.js';
import { TasksService } from './tasks.service.js';

// Module = 一个部门的编制表。Day 9 起它还是「人事部的登记簿」:
// 每一行都在说「有人要 X 这个 token 时,怎么造出来」。
@Module({
  imports: [DatabaseModule], // Day 27:连接池(PG_POOL)
  controllers: [TasksController, TasksV1Controller], // Day 19:v2(+ 不带版本)与已弃用的 v1
  providers: [
    // 简写:等于 { provide: TasksService, useClass: TasksService },类本身就是 token
    TasksService,

    // Day 9:useClass,要「仓储」时用内存实现来造。
    // Day 27:改成 useFactory,按配置 TASKS_STORAGE 选实现 —— TasksService、Controller、DTO 一行不用改。
    //   默认 memory:测试、day08–day20 的观察脚本照样不需要数据库
    //   postgres:PgTasksRepository(连接池来自 DatabaseModule)
    // 返回类型写成 TasksRepository:两个类有任何一个不满足接口,编译直接报错(Day 12 classProvider 的同一个保证)
    {
      provide: TASKS_REPOSITORY,
      useFactory: (seed: Task[], pool: pg.Pool, config?: ConfigService<Env, true>): TasksRepository => {
        if (config?.get('TASKS_STORAGE', { infer: true }) !== 'postgres') return new InMemoryTasksRepository(seed);
        return new PgTasksRepository(
          pool,
          config.get('DB_RESET_ON_START', { infer: true }) ? seed : null,
          config.get('DATABASE_SCHEMA', { infer: true }), // Day 41:启动时核对 search_path 是否生效
        );
      },
      // ConfigService 设成 optional:单元测试里只导入 TasksModule(没有 ConfigModule)时,默认用内存版
      inject: [TASKS_SEED, PG_POOL, { token: ConfigService, optional: true }],
    },

    // useValue:现成的对象直接放进去,不用造
    // Day 12:valueProvider 会检查 systemClock 是不是一个 Clock
    valueProvider(CLOCK, systemClock),

    // useFactory + inject:先把 CLOCK 造好传给工厂函数,再用它的返回值当 provider
    {
      provide: TASKS_SEED,
      useFactory: (clock: Clock): Task[] => {
        const openedAt = clock.now().toISOString(); // 开业时间
        return [
          { id: 1, title: '跑通 nest new', done: true, checklist: [], createdAt: openedAt, version: 1 },
          { id: 2, title: '看懂 Module / Controller / Provider', done: false, checklist: [], createdAt: openedAt, version: 1 },
        ];
      },
      inject: [CLOCK],
    },
  ],
})
export class TasksModule {}
