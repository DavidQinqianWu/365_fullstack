import { setTimeout as sleep } from 'node:timers/promises';
import { RequestContextService } from './request-context.service.js';

describe('RequestContextService', () => {
  const ctx = new RequestContextService();

  it('run 外面拿不到 requestId', () => {
    expect(ctx.requestId).toBeUndefined();
  });

  it('run 里面,跨过 await 也能拿到同一个 requestId', async () => {
    await ctx.run({ requestId: 'r1', startedAt: performance.now() }, async () => {
      expect(ctx.requestId).toBe('r1');
      await sleep(5);
      expect(ctx.requestId).toBe('r1');
    });
  });

  it('两个并发的 run 互不干扰', async () => {
    const seen: string[] = [];
    const job = (id: string, ms: number) =>
      ctx.run({ requestId: id, startedAt: performance.now() }, async () => {
        await sleep(ms);
        seen.push(`${id}:${ctx.requestId}`);
      });
    await Promise.all([job('a', 20), job('b', 5)]);
    expect(seen).toEqual(['b:b', 'a:a']);
  });
});
