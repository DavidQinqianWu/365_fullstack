import { Injectable } from '@nestjs/common';
import { requestContext, type RequestStore } from './request-context.js';

// DI 版的门面:想在 Service / Interceptor / Filter 里拿当前请求的信息,就注入它。
// 它是单例(Day 9),但它自己不存 requestId 字段 —— 每次都去 ALS 里取「当前这条异步链」的值。
// (对比 src/request-context-demo/ 里故意写坏的 BadRequestIdService:把 requestId 存在单例字段上 → 串号)
@Injectable()
export class RequestContextService {
  run<T>(store: RequestStore, fn: () => T): T {
    return requestContext.run(store, fn);
  }

  get requestId(): string | undefined {
    return requestContext.getStore()?.requestId;
  }

  // 从进门到现在过了多少毫秒(请求外调用返回 undefined)
  elapsedMs(): number | undefined {
    const store = requestContext.getStore();
    return store ? performance.now() - store.startedAt : undefined;
  }
}
