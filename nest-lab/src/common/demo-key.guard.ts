import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

// 切面 #3:门口保安(最简单的鉴权演示)。只看一个请求头,真正的 JWT 鉴权在 Week 10。
// 返回 true = 放行;返回 false = Nest 自动抛 ForbiddenException(403),后面的站全部跳过。
export const DEMO_KEY_HEADER = 'x-demo-key';
export const DEMO_KEY = 'let-me-in';

@Injectable()
export class DemoKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const ok = req.headers[DEMO_KEY_HEADER] === DEMO_KEY;
    const where = `${context.getClass().name}.${context.getHandler().name}`;
    console.log(`  ②-1 Guard 保安查 ${DEMO_KEY_HEADER} → ${where}:${ok ? '放行' : '拦下'}`);
    return ok;
  }
}
