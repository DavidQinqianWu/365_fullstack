import { NotAcceptableException, UnsupportedMediaTypeException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

// Day 15:内容协商的最小版(这家店只会说 JSON)。
// ① 客户端用 Accept 说「我只看得懂 XML」→ 406 Not Acceptable(我给不出你要的表示)
// ② 客户端用 Content-Type 说「我递过来的是纯文本 / 表单」→ 415 Unsupported Media Type(我读不懂你给的格式)
// Nest / Express 默认两件事都不管:Accept 不匹配照样回 JSON;非 JSON 的请求体会被当成「没有请求体」。
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

export function contentNegotiation(req: Request, _res: Response, next: NextFunction): void {
  // 没写 Accept、写了 */* 或 application/*,都算能接受 JSON
  if (!req.accepts('application/json')) {
    throw new NotAcceptableException(`只能返回 application/json,你的 Accept 是:${req.headers.accept}`);
  }
  // 只检查「真的带了请求体」的写请求;没有请求体(Content-Length: 0)交给 handler 自己判断(400)
  const hasBody = Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined;
  if (METHODS_WITH_BODY.has(req.method) && hasBody && !req.is('application/json')) {
    throw new UnsupportedMediaTypeException(`请求体只接受 application/json,你发来的是:${req.headers['content-type']}`);
  }
  next();
}
