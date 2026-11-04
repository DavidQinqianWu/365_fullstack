// Day 37:序列化失败(SQLSTATE 40001)时,把「整个事务」从头重做一遍的最小辅助函数。
//
// 不依赖任何数据库驱动:你传进来一个「做一次完整事务」的函数(从 BEGIN 到 COMMIT,包括里面所有的读和写),
// 它出错且错误可重试时,等一会儿再从头调用一次。nest-lab 的观察脚本(npm run day37)用它连真实的 PostgreSQL 演示。
//
// 三个要点:
//   ① 重试的是整个事务,不是最后一条语句:失败的事务里读到的东西已经过时了,必须重新读、重新算
//   ② 只重试「换个时机再来就可能成功」的错误:40001(serialization_failure)、40P01(deadlock_detected);
//      约束违反(23xxx)、语法错误这类重试一万次也一样,直接抛出
//   ③ 有上限、有退避:每次等的时间翻倍并加随机抖动,避免几个冲突的事务又在同一时刻撞在一起
//
// Day 40 会决定 nest-lab 用乐观锁、悲观锁还是 Serializable + 重试;这个文件只是今天的实验,不进 nest-lab 的 src。

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
