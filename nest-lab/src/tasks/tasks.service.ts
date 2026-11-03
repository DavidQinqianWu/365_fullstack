import { Injectable, NotFoundException } from '@nestjs/common';
import type { Task } from './task.js';

// Provider / Service = 后厨:只管「把菜做出来」(业务逻辑 + 数据),不关心 HTTP。
// @Injectable() 是一张标签:「这个类交给 Nest 管,需要的人由 Nest 送过去」(怎么送的,Day 9 拆开讲)。
@Injectable()
export class TasksService {
  // 今天先用内存数组当「冰箱」:进程一重启就清空,Week 4 换成 PostgreSQL。
  private readonly tasks: Task[] = [
    { id: 1, title: '跑通 nest new', done: true },
    { id: 2, title: '看懂 Module / Controller / Provider', done: false },
  ];
  private nextId = 3;

  findAll(): Task[] {
    console.log('   ④ Service    后厨做菜:findAll');
    return this.tasks;
  }

  findOne(id: number): Task {
    console.log(`   ④ Service    后厨做菜:findOne(${id})`);
    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      // 不用自己 res.writeHead(404):抛一个「带状态码的异常」,
      // Nest 内置的 exception filter 会把它翻译成 404 + JSON。
      throw new NotFoundException(`没有 id 为 ${id} 的任务`);
    }
    return task;
  }

  create(title: string): Task {
    console.log(`   ④ Service    后厨做菜:create("${title}")`);
    const task: Task = { id: this.nextId++, title, done: false };
    this.tasks.push(task);
    return task;
  }
}
