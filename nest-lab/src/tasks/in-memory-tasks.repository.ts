import { Inject, Injectable } from '@nestjs/common';
import type { Task, TaskWritable } from './task.js';
import { compareBySort, sortTuple, type TaskQuery } from './task-query.js';
import { TASKS_SEED, type TasksRepository, type UpdateResult } from './tasks.repository.js';

// 仓储的第一个实现:内存数组(就是 Day 8 写在 TasksService 里的那个数组,今天搬到这里)。
// Day 27:接口改成 async 之后,这里的方法也标成 async —— 逻辑一行没改,只是返回值包进了 Promise。
//
// Day 40:两处修改
//   ① 读出去的一律是「复印件」(structuredClone)。以前 findById 交出去的是数组里那个对象本身,
//      调用方拿到的「快照」会被别的请求的 Object.assign 偷偷改掉 —— PG 版读到的是真正的快照,两边行为不一致;
//      Day 40 的并发测试在内存版上就因为这个「碰巧通过」了一个本该失败的用例
//   ② update 带版本号检查。检查和写入之间没有 await,单线程的 JS 不会在中间切到别的请求,所以这一步天然是原子的;
//      会被插队的是 Service 里「await 读 → 判断 → await 写」之间的那几个 await(见讲义卡 #1)
const copy = (task: Task): Task => structuredClone(task);

@Injectable()
export class InMemoryTasksRepository implements TasksRepository {
  private readonly rows: Task[];
  private nextId: number;

  // 样品菜由 TASKS_SEED 这个 useFactory provider 造好送进来
  constructor(@Inject(TASKS_SEED) seed: Task[]) {
    this.rows = [...seed];
    this.nextId = seed.length + 1;
  }

  async findAll(): Promise<Task[]> {
    return this.rows.map(copy);
  }

  async findById(id: number): Promise<Task | undefined> {
    const task = this.rows.find((t) => t.id === id);
    return task && copy(task);
  }

  async insert(data: Omit<Task, 'id' | 'version'>): Promise<Task> {
    const task: Task = { id: this.nextId++, ...structuredClone(data), version: 1 };
    this.rows.push(task);
    return copy(task);
  }

  async remove(id: number): Promise<Task | undefined> {
    const index = this.rows.findIndex((t) => t.id === id);
    if (index === -1) return undefined;
    const [removed] = this.rows.splice(index, 1);
    return removed;
  }

  async update(id: number, changes: Partial<TaskWritable>, expectedVersion?: number): Promise<UpdateResult> {
    const task = this.rows.find((t) => t.id === id);
    if (!task) return { status: 'not-found' };
    if (expectedVersion !== undefined && task.version !== expectedVersion) return { status: 'stale' }; // WHERE … AND version = $2
    Object.assign(task, structuredClone(changes)); // id、createdAt、version 由服务器管理,不在 changes 的类型里
    task.version += 1; // SET version = version + 1
    return { status: 'updated', task: copy(task) };
  }

  // 内存版的「悲观锁」:读 → decide → 写之间没有 await,别的请求插不进来,相当于一直「压着镇纸」
  async updateLocked(id: number, decide: (current: Task) => Partial<TaskWritable>): Promise<Task | undefined> {
    const task = this.rows.find((t) => t.id === id);
    if (!task) return undefined;
    const changes = decide(copy(task)); // 抛异常 = 不写
    Object.assign(task, structuredClone(changes));
    task.version += 1;
    return copy(task);
  }

  // Day 19:内存版的 WHERE / ORDER BY / LIMIT。每一步旁边写着对应的 SQL(Day 27 的真实版本见 pg-tasks.repository.ts)。
  async findPage(query: TaskQuery): Promise<Task[]> {
    const { filter, sort, limit, after, offset } = query;
    const q = filter.q?.toLowerCase();
    let rows = this.rows.filter(
      (t) =>
        (filter.done === undefined || t.done === filter.done) && // WHERE done = $1
        (q === undefined || t.title.toLowerCase().includes(q)), //   AND title ILIKE '%' || $2 || '%'
    );
    rows = [...rows].sort((a, b) => compareBySort(sortTuple(a, sort), sortTuple(b, sort), sort)); // ORDER BY …, id
    if (after) {
      // keyset:WHERE (createdAt, id) > ($3, $4) —— 「从书签之后继续」,不用数前面有多少条
      // (after.values 是上一页最后一条的完整排序元组,最后一列就是 id)
      rows = rows.filter((t) => compareBySort(sortTuple(t, sort), after.values, sort) > 0);
    }
    const start = offset ?? 0; // OFFSET $5 —— 数据库也得先数完前面这些行再扔掉
    return rows.slice(start, start + limit).map(copy); // LIMIT $6
  }
}
