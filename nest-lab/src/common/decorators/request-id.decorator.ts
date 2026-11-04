import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';

// 参数装饰器:createParamDecorator((data, ctx) => 值)。
// 和元数据装饰器不同,这个工厂函数「每个请求都会执行一次」,返回值就是参数的值。
// 用法:create(@RequestId() requestId: string)
// 规则:客户端 / 网关带了 x-request-id 就沿用(方便串起整条调用链),没带就现生成一个。
// (Week 10 会用同样的方式写 @CurrentUser(),从 JWT 里取出当前用户)
export const RequestId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const header = req.headers['x-request-id'];
  const id = typeof header === 'string' && header !== '' ? header : randomUUID();
  console.log(`  🏷️ @RequestId() 取值:${id}`);
  return id;
});
