import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { User, UserRole } from '../user.js';

// Day 18:出口报关单(响应 DTO)+ 显式映射函数 —— nest-lab 的主线做法。
// 只有这里列出来的字段会出门;User 以后加多少字段(resetToken、deletedAt……),都不会自动出现在响应里。
// 响应 DTO 也是对外契约:字段只增不减,改名 / 删除要走版本化(Day 19)。
// Day 20:interface → class,同一个类既是映射函数的返回类型,也是 OpenAPI schema(见 task-response.ts 的说明)
export class UserResponse {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ description: '非管理员视图会打码,如 a***@example.com', example: 'a***@example.com' }) email!: string;
  @ApiProperty({ example: 'Alice' }) displayName!: string;
  @ApiProperty({ enum: ['user', 'admin'] }) role!: UserRole;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiPropertyOptional({ description: '内部备注,只有管理员视图(x-demo-role: admin)才有' }) internalNote?: string;
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
