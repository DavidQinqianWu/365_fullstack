import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from './decorators/roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

// 类上贴 ['staff'],两个方法:一个不贴(继承类上的),一个贴 ['admin'](覆盖类上的)
class ZoneController {
  staffZone() {}
  adminZone() {}
}
Roles(['staff'])(ZoneController);
Roles(['admin'])(
  ZoneController.prototype,
  'adminZone',
  Object.getOwnPropertyDescriptor(ZoneController.prototype, 'adminZone')!,
);

function contextWith(handler: () => void, role?: string): ExecutionContext {
  const headers = role ? { 'x-demo-role': role } : {};
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    getClass: () => ZoneController,
    getHandler: () => handler,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());
  const { staffZone, adminZone } = ZoneController.prototype;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('方法上没贴 → 用类上的 [staff]', () => {
    expect(guard.canActivate(contextWith(staffZone, 'staff'))).toBe(true);
    expect(guard.canActivate(contextWith(staffZone))).toBe(false);
  });

  it('方法上贴了 [admin] → 覆盖类上的 [staff](就近原则)', () => {
    expect(guard.canActivate(contextWith(adminZone, 'staff'))).toBe(false);
    expect(guard.canActivate(contextWith(adminZone, 'admin'))).toBe(true);
  });

  it('类和方法都没贴 @Roles → 不限制角色', () => {
    class Plain {
      any() {}
    }
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      getClass: () => Plain,
      getHandler: () => Plain.prototype.any,
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
