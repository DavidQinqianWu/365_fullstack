import { SetMetadata } from '@nestjs/common';

// 元数据装饰器 #1(经典写法):SetMetadata(key, value)。
// @Public() = 在方法 / 类上贴一张「免检」标签。它自己什么都不做,读标签的是 DemoKeyGuard。
// key 用常量导出,贴的人和读的人用同一个常量 —— 手打字符串拼错了不会报错,只会静默失效。
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
