import { ApiProperty } from '@nestjs/swagger';
import type { Task } from '../task.js';

// Day 18:任务的出口报关单。现在字段和内部 Task 刚好一样,看起来「多此一举」——
// 但等 Week 4 内部模型多出 deletedAt、ownerId、version 这类字段时,响应不会跟着自动变。
// 响应也是对外契约:字段只增不减,改名 / 删除要走版本化(Day 19)。
//
// Day 20:从 interface 改成 class,同一个类同时是
//   ① 映射函数的返回类型(TypeScript 检查 toTaskResponse 写的对象字面量:少字段、多字段都编译报错)
//   ② 菜单册的 schema(@ApiProperty)
// 「文档里的字段」和「真实返回的字段」只有一个来源;剩下的风险是「某个字段忘了贴 @ApiProperty」,
// 由 test/openapi.e2e-spec.ts 拿映射函数的真实输出和 schema 比对兜底。
export class ChecklistItemResponse {
  @ApiProperty({ example: '买菜' }) text!: string;
  @ApiProperty({ example: false }) done!: boolean;
}

export class TaskResponse {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ example: '学 OpenAPI' }) title!: string;
  @ApiProperty({ example: false }) done!: boolean;
  @ApiProperty({ type: () => [ChecklistItemResponse] }) checklist!: ChecklistItemResponse[];
  @ApiProperty({ format: 'date-time', example: '2026-01-01T00:00:00.000Z' }) createdAt!: string;
  // Day 40:新增字段(只增不减,v1 / v2 都带上)。修改时把它放进请求体的 version,就能用上乐观锁
  @ApiProperty({ type: 'integer', example: 1, description: '版本号:新建时为 1,每次修改成功后 + 1' }) version!: number;
}

export function toTaskResponse(task: Task): TaskResponse {
  return {
    id: task.id,
    title: task.title,
    done: task.done,
    checklist: task.checklist.map((i) => ({ text: i.text, done: i.done })),
    createdAt: task.createdAt,
    version: task.version,
  };
}
