import { Inject, Injectable } from '@nestjs/common';
import type { Task } from './task.js';
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

  update(id: number, changes: Partial<Pick<Task, 'title' | 'done'>>): Task | undefined {
    const task = this.findById(id);
    if (!task) return undefined;
    Object.assign(task, changes); // id、createdAt 由服务器管理,不在 changes 的类型里
    return task;
  }
}
