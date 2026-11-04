import type { User, UserRole } from '../user.js';

// Day 18:出口报关单(响应 DTO)+ 显式映射函数 —— nest-lab 的主线做法。
// 只有这里列出来的字段会出门;User 以后加多少字段(resetToken、deletedAt……),都不会自动出现在响应里。
// 响应 DTO 也是对外契约:字段只增不减,改名 / 删除要走版本化(Day 19)。
export interface UserResponse {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string; // ISO 字符串
  internalNote?: string; // 只有管理员能看到
}

export type Viewer = 'user' | 'admin';

// 普通访客看到的 email 打码:alice@example.com → a***@example.com
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  return `${(name ?? '').slice(0, 1)}***@${domain ?? ''}`;
}

export function toUserResponse(user: User, viewer: Viewer): UserResponse {
  const base: UserResponse = {
    id: user.id,
    email: viewer === 'admin' ? user.email : maskEmail(user.email),
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
  // 「同一个资源,不同的人看到不同字段」—— 就是一个 if,不需要 groups 魔法
  return viewer === 'admin' ? { ...base, internalNote: user.internalNote } : base;
}
