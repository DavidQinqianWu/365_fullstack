// 用户在「店里」(内存 / 将来的数据库)的样子 —— 内部模型,里面有绝对不能出门的东西。
export type UserRole = 'user' | 'admin';

export interface User {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  passwordHash: string; // ❌ 绝对不能出现在任何响应里(也不能进日志)
  internalNote: string; // ⚠️ 只给管理员看的内部备注
  createdAt: Date; // 内部用 Date,出门时转成 ISO 字符串
}
