// Day 40:「出错时把整件事从头重做」的重试辅助函数(Day 37 在仓库根目录 src/37-isolation-levels/ 里写的实验版,今天搬进 nest-lab)。
//
// 不依赖任何数据库驱动:你传进来一个「做一次完整操作」的函数(比如从 BEGIN 到 COMMIT 的整个事务,
// 或者 TasksService 里「读 → 判断 → 带版本号写」的一整轮),它抛出可重试的错误时,等一会儿再从头调用一次。
//
// 三个要点:
//   ① 重做的是整件事,不是最后一步:失败那一轮读到的东西已经过时了,必须重新读、重新判断
//   ② 只重试「换个时机再来就可能成功」的错误:默认是 PostgreSQL 的 40001(serialization_failure)、40P01(deadlock_detected);
//      调用方可以用 isRetryable 换成自己的判断(TasksService 用它重试「写的时候版本号变了」)
//   ③ 有上限、有退避:每次等的时间翻倍并加随机抖动,避免几个冲突的操作又在同一时刻撞在一起

export interface RetryInfo {
  attempt: number; // 刚刚失败的是第几次(从 1 开始)
  delayMs: number; // 下一次之前等多久
  error: unknown;
}

export interface RetryOptions {
  maxAttempts?: number; // 最多做几次(含第一次),默认 5
  baseDelayMs?: number; // 第一次重试前最多等多久,默认 10 ms
  maxDelayMs?: number; // 单次等待的上限,默认 500 ms
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (info: RetryInfo) => void;
  sleep?: (ms: number) => Promise<void>; // 测试时可以换成不真的等
  random?: () => number; // 测试时可以换成固定值
}

const RETRYABLE_SQLSTATES = new Set(['40001', '40P01']);

/** PostgreSQL 的「换个时机再来就可能成功」的错误:序列化失败、死锁 */
export function isRetryableTransactionError(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code: unknown }).code : undefined;
  return typeof code === 'string' && RETRYABLE_SQLSTATES.has(code);
}

/** 指数退避 + 全抖动:第 n 次失败后,等 [0, min(上限, 基数 × 2^(n-1))) 之间的随机时间 */
export function backoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number, random: () => number): number {
  return Math.floor(random() * Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)));
}

export async function withRetry<T>(runTransaction: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 5,
    baseDelayMs = 10,
    maxDelayMs = 500,
    isRetryable = isRetryableTransactionError,
    onRetry,
    sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    random = Math.random,
  } = options;
  for (let attempt = 1; ; attempt++) {
    try {
      return await runTransaction(attempt);
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryable(error)) throw error;
      const delayMs = backoffDelay(attempt, baseDelayMs, maxDelayMs, random);
      onRetry?.({ attempt, delayMs, error });
      await sleep(delayMs);
    }
  }
}
