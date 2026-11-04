import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { ctxLog } from '../common/request-context/request-context.js';
import { BadKitchenService, KitchenService } from './kitchen.service.js';

// Day 13 实验部门:不挂进 AppModule,只在 day13 脚本和测试里临时组装。
@Public()
@Controller('kitchen')
export class KitchenController {
  constructor(
    private readonly kitchen: KitchenService,
    private readonly badKitchen: BadKitchenService,
  ) {}

  // GET /kitchen/cook?ms=80 —— 注意:这里没有任何 requestId 参数
  @Get('cook')
  cook(@Query('ms', ParseIntPipe) ms: number) {
    ctxLog('  ③ Controller 前台接单:GET /kitchen/cook');
    return this.kitchen.cook(ms);
  }

  // GET /kitchen/bad?ms=80 —— 单例字段存 requestId 的反面教材
  @Get('bad')
  bad(@Query('ms', ParseIntPipe) ms: number) {
    return this.badKitchen.cook(ms);
  }
}
