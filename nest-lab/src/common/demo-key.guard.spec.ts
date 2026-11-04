import { Controller, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Env } from '../config/env.schema.js';
import { Public } from './decorators/public.decorator.js';
import { DemoKeyGuard } from './demo-key.guard.js';

// 两个测试用的「handler」:一个贴了 @Public(),一个没贴。
// 装饰器就是函数(Day 8):直接调用它,把标签贴到函数上
class TasksController {
  open() {}
  create() {}
}
Public()(TasksController.prototype, 'open', Object.getOwnPropertyDescriptor(TasksController.prototype, 'open')!);
Controller('tasks')(TasksController);

// 手搓一个最小的 ExecutionContext,只提供 guard 用到的几个方法
function contextWith(handler: () => void, headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    getClass: () => TasksController,
    getHandler: () => handler,
  } as unknown as ExecutionContext;
}

describe('DemoKeyGuard(Day 11:全局默认要钥匙,@Public() 免检;Day 12:钥匙来自配置)', () => {
  // Reflector 不依赖任何东西,直接 new;ConfigService 也能直接 new,传进去的对象就是「配置」
  const config = new ConfigService<Env, true>({ DEMO_KEY: 'unit-test-key' });
  const guard = new DemoKeyGuard(new Reflector(), config);

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('贴了 @Public() → 不带钥匙也放行', () => {
    expect(guard.canActivate(contextWith(TasksController.prototype.open, {}))).toBe(true);
  });

  it('没贴 @Public():带上配置里的钥匙 → 放行', () => {
    expect(guard.canActivate(contextWith(TasksController.prototype.create, { 'x-demo-key': 'unit-test-key' }))).toBe(true);
  });

  it('钥匙以配置为准:代码里不再认写死的 let-me-in', () => {
    expect(guard.canActivate(contextWith(TasksController.prototype.create, { 'x-demo-key': 'let-me-in' }))).toBe(false);
  });

  it('没贴 @Public():没带或带错 → 拦下', () => {
    expect(guard.canActivate(contextWith(TasksController.prototype.create, {}))).toBe(false);
    expect(guard.canActivate(contextWith(TasksController.prototype.create, { 'x-demo-key': 'wrong' }))).toBe(false);
  });
});
