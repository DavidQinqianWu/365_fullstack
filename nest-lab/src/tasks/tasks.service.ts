import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CLOCK, type Clock } from '../common/clock.js';
import { ctxLog } from '../common/request-context/request-context.js';
import type { Task, TaskWritable } from './task.js';
import type { CreateTaskDto } from './dto/create-task.dto.js';
import type { ReplaceTaskDto } from './dto/replace-task.dto.js';
import type { UpdateTaskDto } from './dto/update-task.dto.js';
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

  // Day 16:参数从 title 字符串换成 DTO。Service 拿到的已经是「校验过、转换过」的数据
  create(input: CreateTaskDto): Task {
    ctxLog(`   ④ Service    后厨做菜:create("${input.title}")`);
    return this.repo.insert({
      title: input.title,
      done: false, // 新任务一律未完成:这个字段不在 CreateTaskDto 里,客户端改不了
      checklist: input.checklist ?? [],
      createdAt: this.clock.now().toISOString(), // 不写 new Date():时间也是注入的
    });
  }

  // Day 15:PUT —— 用请求里的完整表示替换掉客户端能改的全部字段
  // PUT 是整体替换:没给 checklist = 清空成 [](不是「保留原样」—— 要保留请用 PATCH)
  replace(id: number, input: ReplaceTaskDto): Task {
    ctxLog(`   ④ Service    后厨做菜:replace(${id})`);
    this.assertCanChange(this.findOne(id), input);
    return this.repo.update(id, { title: input.title, done: input.done, checklist: input.checklist ?? [] })!;
  }

  // Day 15:PATCH —— 只改给了的字段
  update(id: number, patch: UpdateTaskDto): Task {
    ctxLog(`   ④ Service    后厨做菜:update(${id}, ${JSON.stringify(patch)})`);
    this.assertCanChange(this.findOne(id), patch);
    // Day 16:只把自己明确列出的字段写进台账,不把 DTO 整包合并(DTO 之外的第二道保险,防批量赋值)
    const changes: Partial<TaskWritable> = {};
    if (patch.title !== undefined) changes.title = patch.title;
    if (patch.done !== undefined) changes.done = patch.done;
    if (patch.checklist !== undefined) changes.checklist = patch.checklist;
    return this.repo.update(id, changes)!;
  }

  remove(id: number): void {
    ctxLog(`   ④ Service    后厨做菜:remove(${id})`);
    if (!this.repo.remove(id)) throw new NotFoundException(`没有 id 为 ${id} 的任务`);
  }

  // 409 Conflict:请求本身没毛病,但和资源「当前的状态」冲突。
  // 规则:已完成的任务不能改标题;要改,请在同一个请求里把 done 改回 false(先重新打开)
  // 这是业务规则,不是格式规则 —— 所以留在 Service,DTO 管不了它(Day 16 讲义卡 #1 边界)
  private assertCanChange(current: Task, changes: UpdateTaskDto): void {
    const renaming = changes.title !== undefined && changes.title !== current.title;
    const staysDone = (changes.done ?? current.done) === true;
    if (current.done && renaming && staysDone) {
      throw new ConflictException(`任务 ${current.id} 已完成,不能改标题;请先把 done 改为 false`);
    }
  }
}
