import { AsyncLocalStorage } from 'node:async_hooks';

// 「跟着这桌客人走的隐形桌号牌」。
// AsyncLocalStorage(ALS):在 als.run(store, fn) 里面执行的代码,以及它衍生出来的所有异步操作
// (await 之后的续体、setTimeout、Promise 回调、流事件……),调用 als.getStore() 都能拿到同一个 store。
// 不用把 requestId 当参数一层层往下传。底层基于 async_hooks,有少量性能开销。
export interface RequestStore {
  requestId: string;
  startedAt: number; // performance.now(),用来算「从进门到现在」的耗时
}

// 整个进程只需要一个 ALS 实例。它不是「全局变量存 requestId」——
// 这个实例本身是全局的,但 getStore() 返回的是「当前这条异步链」的 store,每个请求各一份。
export const requestContext = new AsyncLocalStorage<RequestStore>();

export function currentRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

// 带桌号的日志:在请求里打印时自动加上 [requestId 前 8 位],请求外(启动、定时任务)打印 [--------]
export function ctxLog(message: string): void {
  const id = currentRequestId();
  const tag = id ? id.slice(0, 8).padEnd(8) : '--------';
  console.log(`[${tag}] ${message}`);
}
