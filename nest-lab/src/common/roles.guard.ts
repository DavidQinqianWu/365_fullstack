import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Roles } from './decorators/roles.decorator.js';
import { ctxLog } from './request-context/request-context.js';

// 读 @Roles 标签的保安。角色暂时从请求头 x-demo-role 读 —— 谁都能伪造,只是演示!
// Week 10 换成 JWT:角色从验签后的 token 里取。
export const DEMO_ROLE_HEADER = 'x-demo-role';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 就近原则:方法上有就用方法的,没有再看类上的
    const required = this.reflector.getAllAndOverride(Roles, [context.getHandler(), context.getClass()]);
    const where = `${context.getClass().name}.${context.getHandler().name}`;
    if (!required || required.length === 0) {
      ctxLog(`  ②-1 RolesGuard → ${where}:没有 @Roles 标签,放行`);
      return true;
    }
    const role = context.switchToHttp().getRequest<Request>().headers[DEMO_ROLE_HEADER];
    const ok = typeof role === 'string' && required.includes(role);
    ctxLog(`  ②-1 RolesGuard → ${where}:需要 [${required.join(', ')}],你是 ${role ?? '(没带)'} → ${ok ? '放行' : '拦下'}`);
    return ok;
  }
}
