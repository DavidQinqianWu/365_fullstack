import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';

// Day 17 实验专用:一个「代码 bug」接口,用来看 500 时对外说了什么、日志里记了什么。
// 不挂进 AppModule,只在 day17 脚本和测试里临时组装。
@Public()
@Controller('problem-demo')
export class ProblemDemoController {
  @Get('boom')
  boom(): never {
    // 模拟一个真实世界里很常见的 bug:报错信息里带着敏感的内部细节
    throw new Error('connect ECONNREFUSED 10.0.3.7:5432 (user=nestlab password=hunter2)');
  }
}
