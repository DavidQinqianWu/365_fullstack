import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CLOCK, type Clock } from '../common/clock.js';
import type { Task } from './task.js';
import { TASKS_REPOSITORY, type TasksRepository } from './tasks.repository.js';
import { ctxLog } from '../common/request-context/request-context.js';

// Provider / Service = 后厨:只管「把菜做出来」(业务逻辑),不关心 HTTP。
// Day 9 起:数据存哪、现在几点,都不自己决定,而是在构造函数里「声明我需要什么」,由 Nest 的 IoC 容器送来。
@Injectable()
export class TasksService {
  constructor(
    // 参数类型是接口,运行时会被擦成 Object,Nest 认不出来 → 必须用 @Inject(token) 明确告诉它要哪个
    @Inject(TASKS_REPOSITORY) private readonly repo: TasksRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  findAll(): Task[] {
    ctxLog('   ④ Service    后厨做菜:findAll');
    return this.repo.findAll();
  }

  findOne(id: number): Task {
    ctxLog(`   ④ Service    后厨做菜:findOne(${id})`);
    const task = this.repo.findById(id);
    if (!task) {
      // 不用自己 res.writeHead(404):抛一个「带状态码的异常」,
      // Nest 内置的 exception filter 会把它翻译成 404 + JSON。
      throw new NotFoundException(`没有 id 为 ${id} 的任务`);
    }
    return task;
  }

  create(title: string): Task {
    ctxLog(`   ④ Service    后厨做菜:create("${title}")`);
    return this.repo.insert({
      title,
      done: false,
      createdAt: this.clock.now().toISOString(), // 不写 new Date():时间也是注入的
    });
  }

  remove(id: number): Task {
    ctxLog(`   ④ Service    后厨做菜:remove(${id})`);
    const removed = this.repo.remove(id);
    if (!removed) throw new NotFoundException(`没有 id 为 ${id} 的任务`);
    return removed;
  }
}
