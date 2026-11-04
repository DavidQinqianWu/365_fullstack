import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Env } from '../config/env.schema.js';
import { IS_PUBLIC_KEY } from './decorators/public.decorator.js';

// 门口保安:全局默认要钥匙,贴了 @Public() 的接口免检(Day 11)。
// Day 12:钥匙不再写死在代码里,从配置 DEMO_KEY 读(开发 / 测试默认 'let-me-in',生产必须自己设)。
// 真正的 JWT 鉴权在 Week 10。
export const DEMO_KEY_HEADER = 'x-demo-key';

@Injectable()
export class DemoKeyGuard implements CanActivate {
  private readonly demoKey: string;

  constructor(
    private readonly reflector: Reflector,
    // ConfigService<Env, true>:第二个参数 true = 「已经校验过」,get() 的返回值不再带 undefined
    config: ConfigService<Env, true>,
  ) {
    // infer: true → 返回类型从 Env 里推出来(这里是 string);key 拼错是编译错误
    this.demoKey = config.get('DEMO_KEY', { infer: true });
  }

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
    const ok = req.headers[DEMO_KEY_HEADER] === this.demoKey;
    console.log(`  ②-1 Guard 保安查 ${DEMO_KEY_HEADER} → ${where}:${ok ? '放行' : '拦下'}`);
    return ok;
  }
}
