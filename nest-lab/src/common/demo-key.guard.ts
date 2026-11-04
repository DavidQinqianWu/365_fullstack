import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './decorators/public.decorator.js';

// 门口保安(Day 10 版升级):现在是「全局默认要钥匙」,贴了 @Public() 的接口免检。
// 在 AppModule 里用 APP_GUARD 注册(在 DI 容器里,所以能注入 Reflector)。
// 真正的 JWT 鉴权在 Week 10。
export const DEMO_KEY_HEADER = 'x-demo-key';
export const DEMO_KEY = 'let-me-in';

@Injectable()
export class DemoKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const where = `${context.getClass().name}.${context.getHandler().name}`;
    // 读标签:先看方法上,再看类上;方法上贴了就以方法为准(就近原则)
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      console.log(`  ②-1 Guard 保安 → ${where}:贴了 @Public(),免检放行`);
      return true;
    }
    const req = context.switchToHttp().getRequest<Request>();
    const ok = req.headers[DEMO_KEY_HEADER] === DEMO_KEY;
    console.log(`  ②-1 Guard 保安查 ${DEMO_KEY_HEADER} → ${where}:${ok ? '放行' : '拦下'}`);
    return ok;
  }
}
