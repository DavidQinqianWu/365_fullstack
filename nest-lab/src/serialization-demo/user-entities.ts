import { Exclude, Expose, Transform } from 'class-transformer';
import { maskEmail } from '../users/dto/user-response.js';
import type { User, UserRole } from '../users/user.js';

// Day 18 对照组:用 class-transformer 装饰器 + ClassSerializerInterceptor 控制「出门的样子」。
// (nest-lab 主线用的是 src/users/dto/user-response.ts 里的显式映射函数,理由见讲义卡 #3)

// ① 黑名单:默认全部出门,只把点名的字段拦下。新加的敏感字段如果忘了贴 @Exclude,就会自动出门。
export class UserBlacklistEntity {
  id!: number;
  email!: string;
  displayName!: string;
  role!: UserRole;
  @Exclude() passwordHash!: string;
  internalNote!: string;
  createdAt!: Date;

  constructor(user: User) {
    Object.assign(this, user);
  }
}

// ② 白名单:配合 strategy: 'excludeAll',默认全部不出门,只有贴了 @Expose 的字段才出门。
export class UserWhitelistEntity {
  @Expose() id!: number;

  // @Transform 做出门前的格式化:不是 admin 视图就给 email 打码
  @Expose()
  @Transform(({ value, options }) => (options.groups?.includes('admin') ? value : maskEmail(String(value))))
  email!: string;

  @Expose() displayName!: string;
  @Expose() role!: UserRole;

  passwordHash!: string; // 没有 @Expose → 不出门

  // groups:只有序列化时带上 groups: ['admin'] 才出门(同一资源,不同视图)
  @Expose({ groups: ['admin'] }) internalNote!: string;

  @Expose()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  createdAt!: Date;

  constructor(user: User) {
    Object.assign(this, user);
  }
}
