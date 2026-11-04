import { createToken } from '../common/typed-token.js';
import type { Task } from './task.js';

// 仓储(Repository)接口:后厨只认这份「进货合同」,不关心货是从内存、PostgreSQL 还是 Redis 来的。
export interface TasksRepository {
  findAll(): Task[];
  findById(id: number): Task | undefined;
  insert(data: Omit<Task, 'id'>): Task;
  remove(id: number): Task | undefined; // Day 11 新增:删掉并返回被删的那条
}

// 接口不能当 token(运行时不存在),所以配一个 Symbol token。
// Week 4 换 PostgreSQL 时,只需要把 tasks.module.ts 里 useClass 那一行换成新的实现类。
export const TASKS_REPOSITORY = createToken<TasksRepository>('TASKS_REPOSITORY'); // Day 12:带类型的 token

// 开业样品菜的 token:用字符串 token 演示 —— 简单直观,但全应用里重名就会互相覆盖,所以正式项目更推荐 Symbol。
export const TASKS_SEED = 'TASKS_SEED';
