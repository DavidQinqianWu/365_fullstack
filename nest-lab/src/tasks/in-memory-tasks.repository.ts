import { Inject, Injectable } from '@nestjs/common';
import type { Task, TaskWritable } from './task.js';
import { compareBySort, sortTuple, type TaskQuery } from './task-query.js';
import { TASKS_SEED, type TasksRepository } from './tasks.repository.js';

// 仓储的第一个实现:内存数组(就是 Day 8 写在 TasksService 里的那个数组,今天搬到这里)。
@Injectable()
export class InMemoryTasksRepository implements TasksRepository {
  private readonly rows: Task[];
  private nextId: number;

  // 样品菜由 TASKS_SEED 这个 useFactory provider 造好送进来
  constructor(@Inject(TASKS_SEED) seed: Task[]) {
    this.rows = [...seed];
    this.nextId = seed.length + 1;
  }

  findAll(): Task[] {
    return this.rows;
  }

  findById(id: number): Task | undefined {
    return this.rows.find((t) => t.id === id);
  }

  insert(data: Omit<Task, 'id'>): Task {
    const task: Task = { id: this.nextId++, ...data };
    this.rows.push(task);
    return task;
  }

  remove(id: number): Task | undefined {
    const index = this.rows.findIndex((t) => t.id === id);
    if (index === -1) return undefined;
    const [removed] = this.rows.splice(index, 1);
    return removed;
  }

  update(id: number, changes: Partial<TaskWritable>): Task | undefined {
    const task = this.findById(id);
    if (!task) return undefined;
    Object.assign(task, changes); // id、createdAt 由服务器管理,不在 changes 的类型里
    return task;
  }

  // Day 19:内存版的 WHERE / ORDER BY / LIMIT。每一步旁边写着 Week 4 换成 PostgreSQL 时对应的 SQL。
  findPage(query: TaskQuery): Task[] {
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
    return rows.slice(start, start + limit); // LIMIT $6
  }
}
