import { createToken } from '../common/typed-token.js';
import type { Task, TaskWritable } from './task.js';
import type { TaskQuery } from './task-query.js';

// 仓储(Repository)接口:后厨只认这份「进货合同」,不关心货是从内存、PostgreSQL 还是 Redis 来的。
//
// Day 27:所有方法改成返回 Promise。
// Day 9 写这份合同时,只有内存实现,方法都是同步的 —— 这其实把「数据就在手边」这个假设写进了合同。
// 数据库在另一个进程、另一台机器上,每次读写都是一次网络 I/O(Day 1–3 的 event loop:I/O 一律异步)。
// 「换实现只改一行」的前提,是接口本身没有泄露实现细节;同步签名就是一处泄露,今天把它补上。
// Day 40:带版本号的修改有三种结果。「没这一行」和「版本对不上」要分开 —— 前者是 404,后者是 409
export type UpdateResult = { status: 'updated'; task: Task } | { status: 'not-found' } | { status: 'stale' };

export interface TasksRepository {
  findAll(): Promise<Task[]>;
  findById(id: number): Promise<Task | undefined>;
  insert(data: Omit<Task, 'id' | 'version'>): Promise<Task>; // Day 40:version 由仓储决定(新建 = 1)
  remove(id: number): Promise<Task | undefined>; // Day 11 新增:删掉并返回被删的那条
  // Day 15 新增(Day 16 起含 checklist)。
  // Day 40:改成乐观锁写法 —— 给了 expectedVersion 时,只有当前版本等于它才写(并把版本 + 1),否则返回 stale。
  //   不给 expectedVersion = 无条件覆盖(Day 39 以前的行为,只留给种子数据、观察脚本的「修之前」对照用)
  update(id: number, changes: Partial<TaskWritable>, expectedVersion?: number): Promise<UpdateResult>;
  // Day 40:悲观锁写法 —— 先锁住这一行(PG:SELECT … FOR NO KEY UPDATE),在锁里读到最新状态、交给 decide 判断,
  //   再写;锁一直持有到事务提交。decide 抛异常 = 不写,事务回滚、锁释放。行不存在时返回 undefined。
  //   和 update 的区别:冲突的请求在数据库里排队等,而不是失败后由调用方重来
  updateLocked(id: number, decide: (current: Task) => Partial<TaskWritable>): Promise<Task | undefined>;
  // Day 19:按条件查一页(过滤 + 排序 + keyset 或 offset 分页)。最多返回 query.limit 条
  findPage(query: TaskQuery): Promise<Task[]>;
}

// 接口不能当 token(运行时不存在),所以配一个 Symbol token。
// Day 27:tasks.module.ts 按配置 TASKS_STORAGE 选择 InMemoryTasksRepository 或 PgTasksRepository。
export const TASKS_REPOSITORY = createToken<TasksRepository>('TASKS_REPOSITORY'); // Day 12:带类型的 token

// 开业样品菜的 token:用字符串 token 演示 —— 简单直观,但全应用里重名就会互相覆盖,所以正式项目更推荐 Symbol。
export const TASKS_SEED = 'TASKS_SEED';
