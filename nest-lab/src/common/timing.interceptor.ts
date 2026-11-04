import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { type Observable, tap } from 'rxjs';

// 切面 #1:计时(around advice)。
// 一个 intercept() 函数「包住」handler:next.handle() 之前是去程,pipe(tap(...)) 里是回程。
// 业务代码一行不改,所有接口都多了耗时日志 + X-Response-Time 响应头。
@Injectable()
export class TimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // ExecutionContext 知道这个请求要去哪个类的哪个方法 —— middleware 不知道
    const where = `${context.getClass().name}.${context.getHandler().name}`;
    const start = performance.now();
    console.log(`  ②-2 Interceptor(前) 计时开始 → ${where}`);

    const stop = (outcome: string) => {
      const ms = (performance.now() - start).toFixed(1);
      // 响应还没发出去,这时设置响应头来得及
      context.switchToHttp().getResponse<Response>().setHeader('X-Response-Time', `${ms}ms`);
      console.log(`  ⑤-1 Interceptor(后) 计时结束:${outcome}`);
    };

    return next.handle().pipe(
      tap({
        next: () => stop('正常返回'),
        error: (err: Error) => stop(`抛出了 ${err.constructor.name}`), // 出错也记一笔,然后错误继续往外抛
      }),
    );
  }
}
