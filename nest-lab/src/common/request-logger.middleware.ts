import type { NextFunction, Request, Response } from 'express';

// 生命周期观察用的「门口登记员」(middleware):请求进门时打一行,响应发出去后再打一行。
// 它是请求管线里最早的一站(比 guard / interceptor / pipe 都早),Day 10 会把整条管线拆开讲。
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();
  console.log(`→ ① Middleware 进门:${req.method} ${req.originalUrl}`);
  // 'finish' 是 Day 3/6 讲过的流事件:响应的最后一个字节交给操作系统时触发
  res.on('finish', () => {
    const ms = (performance.now() - start).toFixed(1);
    console.log(`← ⑥ Middleware 出门:${res.statusCode}(${ms} ms)`);
  });
  next(); // 不调用 next(),请求就卡在门口,永远到不了 Controller
}
