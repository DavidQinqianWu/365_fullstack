import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { RequestContextService } from './request-context.service.js';

export const REQUEST_ID_HEADER = 'x-request-id';

// Day 17:「沿用或生成」抽成一个函数 —— 发牌 middleware 和投诉台(filter 兜底)用同一套规则
export function resolveRequestId(req: Request): string {
  const header = req.headers[REQUEST_ID_HEADER];
  return typeof header === 'string' && header !== '' ? header : randomUUID();
}

// 门口发桌号牌:管线的第一站。
// 客户端 / 网关带了 x-request-id 就沿用(方便跨服务串日志),没带就现生成一个;
// 回写到响应头,客户端报错时可以把这个 ID 发给你。
// 这是一个「类」middleware:在 AppModule.configure() 里注册,能注入 RequestContextService。
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly context: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = resolveRequestId(req);
    res.setHeader(REQUEST_ID_HEADER, requestId);
    // 关键一行:后面整条管线(guard、interceptor、pipe、controller、service、filter)
    // 都在这个 run 的回调里、或者由它衍生的异步操作里执行,所以都能拿到同一个 store
    this.context.run({ requestId, startedAt: performance.now() }, () => next());
  }
}
