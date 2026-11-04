import { type CallHandler, type ExecutionContext, Inject, Injectable, type NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import { CLOCK, type Clock } from './clock.js';

// 切面 #2:统一响应包装。handler 返回什么,都包成 { data, timestamp }。
// 只改「成功」的返回值 —— 抛异常时 map 根本不会执行,错误体由 exception filter 负责。
// Week 3 会把成功体 / 错误体(problem+json)放在一起重新设计。
export interface Wrapped<T> {
  data: T;
  timestamp: string;
}

@Injectable()
export class WrapResponseInterceptor<T> implements NestInterceptor<T, Wrapped<T>> {
  // 它也是 Provider:由 Day 9 的容器造出来,能注入 CLOCK(测试里可以固定时间)
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<Wrapped<T>> {
    return next.handle().pipe(
      map((data) => {
        console.log('  ⑤-1 Interceptor(后) 包装成 { data, timestamp }');
        return { data, timestamp: this.clock.now().toISOString() };
      }),
    );
  }
}
