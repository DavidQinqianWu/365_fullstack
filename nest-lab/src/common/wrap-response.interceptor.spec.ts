import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { WrapResponseInterceptor } from './wrap-response.interceptor.js';

// 切面也能单独测:不起 HTTP,手动给它一个「假的 handler」(一个 Observable)
describe('WrapResponseInterceptor', () => {
  const clock = { now: () => new Date('2026-01-01T00:00:00.000Z') };
  const interceptor = new WrapResponseInterceptor(clock);
  const ctx = {} as ExecutionContext; // 这个 interceptor 用不到 context

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('把 handler 的返回值包成 { data, timestamp }', async () => {
    const next: CallHandler = { handle: () => of({ id: 1 }) };
    await expect(lastValueFrom(interceptor.intercept(ctx, next))).resolves.toEqual({
      data: { id: 1 },
      timestamp: '2026-01-01T00:00:00.000Z',
    });
  });

  it('handler 抛错时不包装,错误原样往外抛(交给 exception filter)', async () => {
    const next: CallHandler = { handle: () => throwError(() => new Error('后厨着火')) };
    await expect(lastValueFrom(interceptor.intercept(ctx, next))).rejects.toThrow('后厨着火');
  });
});
