import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { type Observable, tap } from 'rxjs';
import { ctxLog } from './request-context/request-context.js';
import { RequestContextService } from './request-context/request-context.service.js';

// 切面 #1:计时(around advice)。
// 一个 intercept() 函数「包住」handler:next.handle() 之前是去程,pipe(tap(...)) 里是回程。
// Day 13:改用 APP_INTERCEPTOR 注册(在 DI 容器里),所以能注入 RequestContextService,
// 额外报出「从进门(middleware)算起」的总耗时。Day 10 的 useGlobalInterceptors(new X()) 做不到注入。
@Injectable()
export class TimingInterceptor implements NestInterceptor {
  constructor(private readonly context: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // ExecutionContext 知道这个请求要去哪个类的哪个方法 —— middleware 不知道
    const where = `${context.getClass().name}.${context.getHandler().name}`;
    const start = performance.now();
    ctxLog(`  ②-2 Interceptor(前) 计时开始 → ${where}`);

    const stop = (outcome: string) => {
      const ms = (performance.now() - start).toFixed(1);
      // 响应还没发出去,这时设置响应头来得及
      context.switchToHttp().getResponse<Response>().setHeader('X-Response-Time', `${ms}ms`);
      const total = this.context.elapsedMs()?.toFixed(1) ?? '?';
      ctxLog(`  ⑤-1 Interceptor(后) 计时结束:${outcome}(handler ${ms} ms,从进门算起 ${total} ms)`);
    };

    return next.handle().pipe(
      tap({
        next: () => stop('正常返回'),
        error: (err: Error) => stop(`抛出了 ${err.constructor.name}`), // 出错也记一笔,然后错误继续往外抛
      }),
    );
  }
}
