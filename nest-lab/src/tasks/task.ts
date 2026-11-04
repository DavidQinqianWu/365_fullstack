// 一条任务在「店里」(内存 / 将来的数据库)长什么样 —— 这是内部模型,不是接口的报关单。
// 接口进来的格式见 src/tasks/dto/(Day 16),两者故意分开:字段不同、演化速度不同。
export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface Task {
  id: number; // 服务器分配,客户端不能指定
  title: string;
  done: boolean;
  checklist: ChecklistItem[]; // Day 16 新增:子任务清单(演示嵌套校验)
  createdAt: string; // Day 9 新增:ISO 时间字符串,由注入的 Clock 决定(测试里可以固定)
  // Day 40:版本号(乐观锁)。新建时是 1,每成功修改一次 + 1,由仓储维护;
  // 「我是照着第几版改的」对不上 = 在我读和写之间有人改过 → 409 conflict/stale-version
  version: number;
}

// 客户端能写的那部分字段(id、createdAt 由服务器管理)
export type TaskWritable = Pick<Task, 'title' | 'done' | 'checklist'>;
