import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CLOCK, type Clock } from '../common/clock.js';
import { ProblemException } from '../common/problems/problem.exception.js';
import { ProblemTypes } from '../common/problems/problem-types.js';
import { ctxLog } from '../common/request-context/request-context.js';
import { withRetry } from '../database/with-retry.js';
import type { Task, TaskWritable } from './task.js';
import type { CreateTaskDto } from './dto/create-task.dto.js';
import type { ReplaceTaskDto } from './dto/replace-task.dto.js';
import type { UpdateTaskDto } from './dto/update-task.dto.js';
import { TASKS_REPOSITORY, type TasksRepository } from './tasks.repository.js';
import { decodeCursor, encodeCursor } from './cursor.js';
import { DEFAULT_LIMIT, type ListTasksQueryDto } from './dto/list-tasks-query.dto.js';
import { type SortKey, type TaskFilter, sortTuple, withTieBreaker } from './task-query.js';

// Day 19:'-createdAt' → { field: 'createdAt', dir: 'desc' };没给 sort 时默认按 id 升序
function parseSort(tokens: string[] | undefined): SortKey[] {
  const keys = (tokens ?? []).map((t) =>
    t.startsWith('-') ? { field: t.slice(1), dir: 'desc' as const } : { field: t, dir: 'asc' as const },
  ) as SortKey[];
  return withTieBreaker(keys);
}

// 过滤条件按固定顺序组装(cursor 里会比较它,顺序不同就会被当成「条件变了」)
function toFilter(query: { done?: boolean; q?: string }): TaskFilter {
  const filter: TaskFilter = {};
  if (query.done !== undefined) filter.done = query.done;
  if (query.q !== undefined && query.q !== '') filter.q = query.q;
  return filter;
}

export interface TaskListPage {
  items: Task[];
  nextCursor: string | null;
}

// Provider / Service = 后厨:只管「把菜做出来」(业务逻辑),不关心 HTTP。
// Day 9 起:数据存哪、现在几点,都不自己决定,而是在构造函数里「声明我需要什么」,由 Nest 的 IoC 容器送来。
// Day 27:仓储接口改成 async,这里每个方法跟着 await;业务规则(409、404、分页)一行没变。
@Injectable()
export class TasksService {
  constructor(
    // 参数类型是接口,运行时会被擦成 Object,Nest 认不出来 → 必须用 @Inject(token) 明确告诉它要哪个
    @Inject(TASKS_REPOSITORY) private readonly repo: TasksRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // Day 19:cursor(keyset)分页 —— nest-lab 对外唯一的分页方式
  async listPage(query: ListTasksQueryDto): Promise<TaskListPage> {
    const sort = parseSort(query.sort);
    const filter = toFilter(query);
    const limit = query.limit ?? DEFAULT_LIMIT;
    const after = query.cursor ? decodeCursor(query.cursor, sort, filter) : undefined;
    ctxLog(`   ④ Service    后厨做菜:listPage(limit=${limit}${after ? `, after id=${after.id}` : ''})`);
    // 多取一条:取到了说明还有下一页,不用 COUNT(*)
    const rows = await this.repo.findPage({ filter, sort, limit: limit + 1, ...(after ? { after } : {}) });
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    const nextCursor =
      rows.length > limit && last ? encodeCursor(sort, filter, { values: sortTuple(last, sort), id: last.id }) : null;
    return { items, nextCursor };
  }

  // Day 19:offset 分页 —— 仓储层也实现了,但不对外开放;只给观察脚本做对比(翻页时会重复 / 漏项)
  listByOffset(query: { done?: boolean; q?: string; sort?: string[]; offset: number; limit: number }): Promise<Task[]> {
    return this.repo.findPage({ filter: toFilter(query), sort: parseSort(query.sort), limit: query.limit, offset: query.offset });
  }

  // v1 兼容:不分页,一次返回全部(Day 8–17 的老行为)
  findAll(): Promise<Task[]> {
    ctxLog('   ④ Service    后厨做菜:findAll');
    return this.repo.findAll();
  }

  async findOne(id: number): Promise<Task> {
    ctxLog(`   ④ Service    后厨做菜:findOne(${id})`);
    const task = await this.repo.findById(id);
    if (!task) {
      // 不用自己 res.writeHead(404):抛一个「带状态码的异常」,exception filter 会把它翻译成 404
      throw new NotFoundException(`没有 id 为 ${id} 的任务`);
    }
    return task;
  }

  // Day 16:参数从 title 字符串换成 DTO。Service 拿到的已经是「校验过、转换过」的数据
  create(input: CreateTaskDto): Promise<Task> {
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
  async replace(id: number, input: ReplaceTaskDto): Promise<Task> {
    ctxLog(`   ④ Service    后厨做菜:replace(${id})`);
    return this.change(id, input, { title: input.title, done: input.done, checklist: input.checklist ?? [] });
  }

  // Day 15:PATCH —— 只改给了的字段
  async update(id: number, patch: UpdateTaskDto): Promise<Task> {
    ctxLog(`   ④ Service    后厨做菜:update(${id}, ${JSON.stringify(patch)})`);
    // Day 16:只把自己明确列出的字段写进台账,不把 DTO 整包合并(DTO 之外的第二道保险,防批量赋值)
    const changes: Partial<TaskWritable> = {};
    if (patch.title !== undefined) changes.title = patch.title;
    if (patch.done !== undefined) changes.done = patch.done;
    if (patch.checklist !== undefined) changes.checklist = patch.checklist;
    return this.change(id, patch, changes);
  }

  // Day 40:PUT / PATCH 共用的「读 → 判断业务规则 → 带版本号写」(乐观锁)。
  //
  // Day 27 起这里一直写着「先查(409 规则)再改,中间隔着一次往返 —— 有竞态,Week 6 处理」:
  //   await 读 → 判断 → await 写,两个 await 之间别的请求可以插进来(Node 单线程也一样,插队发生在 await 上)。
  //   插进来的请求如果改了同一个任务,我们会基于过时的数据判断、再把它覆盖掉:
  //     ① 丢失更新:A、B 读到同一版,A 改标题、B 改清单,后写的把先写的悄悄盖掉(PUT 时整份覆盖)
  //     ② 绕过业务规则:读的时候还没完成 → 允许改标题;写之前别人把它标成已完成 → 写出「已完成但标题被改了」
  //
  // 修法:写的时候带上读到的版本号,版本变了就不写(repo.update 返回 stale)。之后:
  //   客户端给了 version(「我是照着第几版改的」)→ 409 conflict/stale-version,由客户端决定怎么办(重新拉取、提示用户……)
  //   客户端没给 version → 它没有表达「基于哪一版」,服务器替它把整轮重做一次:重新读、重新判断业务规则、再写。
  //     重做时如果任务已经被标成已完成,这一轮的 assertCanChange 会给出 409 conflict/task-completed
  //   重试只重做这一轮,不重做别的请求;几次都被抢先(极少见),也回 409 stale-version
  private async change(id: number, input: UpdateTaskDto, changes: Partial<TaskWritable>): Promise<Task> {
    try {
      return await withRetry(
        async (attempt) => {
          const current = await this.findOne(id); // 404 在这里
          if (input.version !== undefined && input.version !== current.version) throw this.stale(id, input.version, current.version);
          assertCanChange(current, input);
          const result = await this.repo.update(id, changes, current.version);
          if (result.status === 'updated') return result.task;
          if (result.status === 'not-found') throw new NotFoundException(`没有 id 为 ${id} 的任务`); // 读的时候还在、写的时候被删了
          if (input.version !== undefined) throw this.stale(id, input.version);
          ctxLog(`   ④ Service    第 ${attempt} 轮写入时版本已变(读到 v${current.version}),重新读、重新判断`);
          throw new LostRace();
        },
        { isRetryable: (err) => err instanceof LostRace, maxAttempts: 3, baseDelayMs: 5, maxDelayMs: 50 },
      );
    } catch (err) {
      if (err instanceof LostRace) throw this.stale(id);
      throw err;
    }
  }

  private stale(id: number, expected?: number, actual?: number): ProblemException {
    const detail =
      actual !== undefined
        ? `任务 ${id} 当前是第 ${actual} 版,请求基于第 ${expected} 版;请重新获取后再修改`
        : `任务 ${id} 在读取之后被其他请求修改了;请重新获取后再修改`;
    return new ProblemException(ProblemTypes.staleVersion, detail);
  }

  async remove(id: number): Promise<void> {
    ctxLog(`   ④ Service    后厨做菜:remove(${id})`);
    if (!(await this.repo.remove(id))) throw new NotFoundException(`没有 id 为 ${id} 的任务`);
  }
}

// 409 Conflict:请求本身没毛病,但和资源「当前的状态」冲突。
// 规则:已完成的任务不能改标题;要改,请在同一个请求里把 done 改回 false(先重新打开)
// 这是业务规则,不是格式规则 —— 所以留在 Service 这一层,DTO 管不了它(Day 16 讲义卡 #1 边界)
// Day 40:从 TasksService 的私有方法改成导出的函数 —— 它只看传进来的 current,不碰仓储,
// 乐观锁(TasksService.change)和悲观锁(repo.updateLocked 的 decide,scripts/day40-try.mjs 里用)共用同一条规则
export function assertCanChange(current: Task, changes: Pick<UpdateTaskDto, 'title' | 'done'>): void {
  const renaming = changes.title !== undefined && changes.title !== current.title;
  const staysDone = (changes.done ?? current.done) === true;
  if (current.done && renaming && staysDone) {
    // Day 17:带上错误类别,调用方可以按 type 精确判断「是哪一种冲突」
    throw new ProblemException(ProblemTypes.taskCompleted, `任务 ${current.id} 已完成,不能改标题;请先把 done 改为 false`);
  }
}

// 「写的时候版本已经变了」—— 只在 TasksService.change 内部用来触发重做,不会出现在响应里
class LostRace extends Error {}
