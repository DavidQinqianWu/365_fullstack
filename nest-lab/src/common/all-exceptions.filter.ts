import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

// 切面 #4:投诉处理台(全局 exception filter 最小版)。
// 不管哪一站抛了异常,都在这里翻译成同一种格式的错误体。
// Week 3 会升级成 RFC 9457 problem+json(Day 6 你手写过的那种)。
export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  path: string;
}

@Catch() // 不写参数 = 什么异常都接(包括普通 Error)
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    // 不是 HttpException 的错误(代码 bug)不把内部信息暴露给客户端
    const message = isHttp ? exception.message : 'Internal server error';
    const body: ErrorBody = {
      statusCode,
      error: HttpStatus[statusCode] ?? 'Error',
      message,
      path: req.originalUrl,
    };
    console.log(`  ⑤-2 Filter 投诉处理台:${exception instanceof Error ? exception.constructor.name : typeof exception} → ${statusCode}`);
    res.status(statusCode).json(body);
  }
}
