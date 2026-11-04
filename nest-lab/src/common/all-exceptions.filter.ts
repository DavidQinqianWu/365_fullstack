import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ctxLog } from './request-context/request-context.js';
import { RequestContextService } from './request-context/request-context.service.js';

// 切面 #4:投诉处理台(全局 exception filter 最小版)。
// 不管哪一站抛了异常,都在这里翻译成同一种格式的错误体。
// Week 3 会升级成 RFC 9457 problem+json(Day 6 你手写过的那种)。
// Day 13:改用 APP_FILTER 注册,注入 RequestContextService,错误体里带上 requestId ——
// 用户报错时把这个 ID 发给你,你就能在日志里找到这个请求的每一行。
export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[]; // Day 16:校验错误是一组字段信息(Day 17 换成 problem+json 的字段明细)
  path: string;
  requestId: string | null;
}

@Injectable()
@Catch() // 不写参数 = 什么异常都接(包括普通 Error)
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly context: RequestContextService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    // 不是 HttpException 的错误(代码 bug)不把内部信息暴露给客户端
    const message = isHttp ? messageOf(exception) : 'Internal server error';
    const body: ErrorBody = {
      statusCode,
      error: HttpStatus[statusCode] ?? 'Error',
      message,
      path: req.originalUrl,
      requestId: this.context.requestId ?? null,
    };
    ctxLog(`  ⑤-2 Filter 投诉处理台:${exception instanceof Error ? exception.constructor.name : typeof exception} → ${statusCode}`);
    res.status(statusCode).json(body);
  }
}

// Day 16:ValidationPipe 抛出的异常,真正的字段错误列表在 getResponse().message 里(exception.message 只是一句概括)
function messageOf(exception: HttpException): string | string[] {
  const response = exception.getResponse();
  if (typeof response === 'object' && response !== null && 'message' in response) {
    const m = (response as { message: unknown }).message;
    if (typeof m === 'string' || (Array.isArray(m) && m.every((x) => typeof x === 'string'))) return m;
  }
  return exception.message;
}
