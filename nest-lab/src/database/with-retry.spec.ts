import { backoffDelay, isRetryableTransactionError, withRetry } from './with-retry.js';

// Day 40:withRetry 的单元测试(断言思路沿用 Day 37 的 with-retry.check.ts)
const serializationFailure = Object.assign(new Error('could not serialize access due to concurrent update'), { code: '40001' });
const uniqueViolation = Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
const noWait = { sleep: async () => {}, random: () => 0.5 };

describe('withRetry', () => {
  it('只有 40001 / 40P01 算可重试', () => {
    expect(isRetryableTransactionError(serializationFailure)).toBe(true);
    expect(isRetryableTransactionError({ code: '40P01' })).toBe(true);
    expect(isRetryableTransactionError(uniqueViolation)).toBe(false);
    expect(isRetryableTransactionError(new Error('no code'))).toBe(false);
    expect(isRetryableTransactionError(null)).toBe(false);
  });

  it('前两次 40001、第三次成功:整件事被调用 3 次,attempt 依次是 1、2、3,退避依次翻倍', async () => {
    const attempts: number[] = [];
    const delays: number[] = [];
    const result = await withRetry(
      async (attempt) => {
        attempts.push(attempt);
        if (attempt < 3) throw serializationFailure;
        return 'ok';
      },
      { ...noWait, onRetry: ({ delayMs }) => delays.push(delayMs) },
    );
    expect(result).toBe('ok');
    expect(attempts).toEqual([1, 2, 3]);
    expect(delays).toEqual([5, 10]); // 0.5 × 10、0.5 × 20
  });

  it('不可重试的错误:第一次就原样抛出', async () => {
    const run = vi.fn(async () => {
      throw uniqueViolation;
    });
    await expect(withRetry(run, noWait)).rejects.toBe(uniqueViolation);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('一直失败:做满 maxAttempts 次后抛出最后一次的错误', async () => {
    const run = vi.fn(async () => {
      throw serializationFailure;
    });
    await expect(withRetry(run, { ...noWait, maxAttempts: 4 })).rejects.toBe(serializationFailure);
    expect(run).toHaveBeenCalledTimes(4);
  });

  it('可以换成自己的 isRetryable 判断', async () => {
    class Busy extends Error {}
    let calls = 0;
    const result = await withRetry(
      async () => {
        if (++calls === 1) throw new Busy();
        return calls;
      },
      { ...noWait, isRetryable: (e) => e instanceof Busy },
    );
    expect(result).toBe(2);
  });

  it('退避有上限', () => {
    expect(backoffDelay(10, 10, 500, () => 0.999)).toBe(499);
    expect(backoffDelay(1, 10, 500, () => 0)).toBe(0);
  });
});
