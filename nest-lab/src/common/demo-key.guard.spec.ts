import type { ExecutionContext } from '@nestjs/common';
import { DemoKeyGuard } from './demo-key.guard.js';

// 手搓一个最小的 ExecutionContext,只提供 guard 用到的几个方法
function contextWith(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    getClass: () => class TasksController {},
    getHandler: () => function create() {},
  } as unknown as ExecutionContext;
}

describe('DemoKeyGuard', () => {
  const guard = new DemoKeyGuard();

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('带对的 x-demo-key → 放行', () => {
    expect(guard.canActivate(contextWith({ 'x-demo-key': 'let-me-in' }))).toBe(true);
  });

  it('没带或带错 → 拦下', () => {
    expect(guard.canActivate(contextWith({}))).toBe(false);
    expect(guard.canActivate(contextWith({ 'x-demo-key': 'wrong' }))).toBe(false);
  });
});
