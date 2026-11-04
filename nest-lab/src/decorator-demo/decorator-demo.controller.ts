import { Controller, Get, SetMetadata, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { RequestId } from '../common/decorators/request-id.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/roles.guard.js';

// Day 11 实验专用:看清「标签贴在哪 / 什么时候贴 / 谁来读 / 读的规则」。
// 和 Day 9 的 scope-demo 一样,不挂进 AppModule,只在 day11 脚本和测试里临时组装。

export const NOTE_KEY = 'note';
// 一个会「自报家门」的元数据装饰器:看它在什么时候执行
export function Note(text: string) {
  console.log(`  📌 @Note('${text}') 执行了 —— 类定义时贴标签`);
  return SetMetadata(NOTE_KEY, text);
}

@Roles(['staff']) // 类级别:默认要 staff
@Note('类上的便签')
@Controller('decorator-demo')
export class DecoratorDemoController {
  // 公开接口:不要钥匙;顺便用参数装饰器拿请求 ID(每个请求执行一次)
  @Public()
  @Note('方法上的便签')
  @Get('open')
  open(@RequestId() requestId: string) {
    return { requestId };
  }

  // 方法上没贴 @Roles → RolesGuard 就近找不到,退回类上的 ['staff']
  @UseGuards(RolesGuard)
  @Get('staff-zone')
  staffZone() {
    return { zone: 'staff' };
  }

  // 方法上贴了 ['admin'] → getAllAndOverride 以方法为准,类上的 staff 被覆盖
  @Roles(['admin'])
  @UseGuards(RolesGuard)
  @Get('admin-zone')
  adminZone() {
    return { zone: 'admin' };
  }

  // ❌ 故意拼错的 key:'isPubilc'(应为 'isPublic')。TypeScript 不会报错,保安也读不到 → 静默失效
  @SetMetadata('isPubilc', true)
  @Get('typo')
  typo() {
    return { zone: 'typo' };
  }
}
