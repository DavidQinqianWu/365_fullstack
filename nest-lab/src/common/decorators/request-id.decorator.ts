import { createParamDecorator } from '@nestjs/common';
import { ctxLog, currentRequestId } from '../request-context/request-context.js';

// 参数装饰器:createParamDecorator((data, ctx) => 值)。
// 和元数据装饰器不同,这个工厂函数「每个请求都会执行一次」,返回值就是参数的值。
// 用法:create(@RequestId() requestId: string)
// Day 13:不再自己读请求头 / 生成 UUID,而是取门口那张桌号牌(RequestContextMiddleware 放进 ALS 的值)
// —— 整个请求只有一个来源,日志前缀、响应头、参数里拿到的永远是同一个 ID。
// (Week 10 会用同样的方式写 @CurrentUser(),从 JWT 里取出当前用户)
export const RequestId = createParamDecorator((): string => {
  const id = currentRequestId() ?? 'no-context';
  ctxLog(`  🏷️ @RequestId() 取值:${id}`);
  return id;
});
