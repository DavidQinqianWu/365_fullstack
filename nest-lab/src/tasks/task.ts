// 一条任务长什么样。今天只是个普通 TS 类型,Week 3 会拆出 DTO,Week 4 会变成数据库表。
export interface Task {
  id: number;
  title: string;
  done: boolean;
  createdAt: string; // Day 9 新增:ISO 时间字符串,由注入的 Clock 决定(测试里可以固定)
}
