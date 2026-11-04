import { ApiProperty } from '@nestjs/swagger';
import { TaskResponse } from './task-response.js';

// Day 19:集合响应 = 「一页任务」这个资源本身的表示(不是 Day 10 那种通用的 { data } 外壳)。
// - items:这一页的任务(每一项都经过 toTaskResponse 映射,Day 18)
// - nextCursor:下一页的书签;null 表示没有下一页了。客户端原样传回 ?cursor=…
// - 没有 total:在大表上 COUNT(*) 很贵(要扫满足条件的全部行),而无限滚动根本不需要它
// Day 20:改成 class,同时作为 OpenAPI schema
export class TaskPage {
  @ApiProperty({ type: () => [TaskResponse] }) items!: TaskResponse[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: '下一页的 cursor;null 表示已经是最后一页。不透明,原样传回 ?cursor=',
    example: 'eyJ2IjoxLCJzIjoiaWQiLCJmIjp7fSwiayI6WzIwXSwiaWQiOjIwfQ',
  })
  nextCursor!: string | null;
}
