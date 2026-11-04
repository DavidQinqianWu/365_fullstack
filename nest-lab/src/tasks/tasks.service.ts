import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CLOCK, type Clock } from '../common/clock.js';
import { ctxLog } from '../common/request-context/request-context.js';
import type { Task } from './task.js';
import type { PatchTaskInput, ReplaceTaskInput } from './task-input.js';
import { TASKS_REPOSITORY, type TasksRepository } from './tasks.repository.js';

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
      // 不用自己 res.writeHead(404):抛一个「带状态码的异常」,exception filter 会把它翻译成 404
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

  // Day 15:PUT —— 用请求里的完整表示替换掉客户端能改的全部字段
  replace(id: number, input: ReplaceTaskInput): Task {
    ctxLog(`   ④ Service    后厨做菜:replace(${id})`);
    this.assertCanChange(this.findOne(id), input);
    return this.repo.update(id, input)!;
  }

  // Day 15:PATCH —— 只改给了的字段
  update(id: number, patch: PatchTaskInput): Task {
    ctxLog(`   ④ Service    后厨做菜:update(${id}, ${JSON.stringify(patch)})`);
    this.assertCanChange(this.findOne(id), patch);
    return this.repo.update(id, patch)!;
  }

  remove(id: number): void {
    ctxLog(`   ④ Service    后厨做菜:remove(${id})`);
    if (!this.repo.remove(id)) throw new NotFoundException(`没有 id 为 ${id} 的任务`);
  }

  // 409 Conflict:请求本身没毛病,但和资源「当前的状态」冲突。
  // 规则:已完成的任务不能改标题;要改,请在同一个请求里把 done 改回 false(先重新打开)
  private assertCanChange(current: Task, changes: PatchTaskInput): void {
    const renaming = changes.title !== undefined && changes.title !== current.title;
    const staysDone = (changes.done ?? current.done) === true;
    if (current.done && renaming && staysDone) {
      throw new ConflictException(`任务 ${current.id} 已完成,不能改标题;请先把 done 改为 false`);
    }
  }
}
