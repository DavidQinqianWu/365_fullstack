import type { Task } from '../task.js';

// Day 18:任务的出口报关单。现在字段和内部 Task 刚好一样,看起来「多此一举」——
// 但等 Week 4 内部模型多出 deletedAt、ownerId、version 这类字段时,响应不会跟着自动变。
// 响应也是对外契约:字段只增不减,改名 / 删除要走版本化(Day 19)。
export interface TaskResponse {
  id: number;
  title: string;
  done: boolean;
  checklist: { text: string; done: boolean }[];
  createdAt: string;
}

export function toTaskResponse(task: Task): TaskResponse {
  return {
    id: task.id,
    title: task.title,
    done: task.done,
    checklist: task.checklist.map((i) => ({ text: i.text, done: i.done })),
    createdAt: task.createdAt,
  };
}
