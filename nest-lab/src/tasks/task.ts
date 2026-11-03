// 一条任务长什么样。今天只是个普通 TS 类型,Week 3 会拆出 DTO,Week 4 会变成数据库表。
export interface Task {
  id: number;
  title: string;
  done: boolean;
}
