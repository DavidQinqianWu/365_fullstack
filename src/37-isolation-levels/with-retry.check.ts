// Day 37:with-retry.ts 的自检(不连数据库)。运行:node src/37-isolation-levels/with-retry.check.ts
import assert from 'node:assert/strict';
import { backoffDelay, isRetryableTransactionError, withRetry } from './with-retry.ts';

const serializationFailure = Object.assign(new Error('could not serialize access due to concurrent update'), { code: '40001' });
const uniqueViolation = Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
const noWait = { sleep: async () => {}, random: () => 0.5 };

// ① 只有 40001 / 40P01 算可重试
assert.equal(isRetryableTransactionError(serializationFailure), true);
assert.equal(isRetryableTransactionError({ code: '40P01' }), true);
assert.equal(isRetryableTransactionError(uniqueViolation), false);
assert.equal(isRetryableTransactionError(new Error('no code')), false);

// ② 前两次 40001,第三次成功:整个函数被调用了 3 次,每次的 attempt 依次是 1、2、3
{
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
  assert.equal(result, 'ok');
  assert.deepEqual(attempts, [1, 2, 3]);
  assert.deepEqual(delays, [5, 10]); // 0.5 × 10、0.5 × 20
}

// ③ 不可重试的错误:第一次就原样抛出,不重试
{
  let calls = 0;
  await assert.rejects(
    withRetry(async () => {
      calls++;
      throw uniqueViolation;
    }, noWait),
    (err) => err === uniqueViolation,
  );
  assert.equal(calls, 1);
}

// ④ 一直 40001:做满 maxAttempts 次后抛出最后一次的错误
{
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls++;
        throw serializationFailure;
      },
      { ...noWait, maxAttempts: 4 },
    ),
    (err) => err === serializationFailure,
  );
  assert.equal(calls, 4);
}

// ⑤ 退避有上限:第 10 次失败后最多等 maxDelayMs
assert.equal(backoffDelay(10, 10, 500, () => 0.999), 499);
assert.equal(backoffDelay(1, 10, 500, () => 0), 0);

console.log('with-retry.check.ts:5 组断言全部通过');
