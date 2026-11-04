import { Module } from '@nestjs/common';
import { RequestCounter, SingletonCounter, TransientCounter } from './counters.js';
import { ReportService } from './report.service.js';
import { ScopeDemoController } from './scope-demo.controller.js';

// Day 9 作用域实验专用部门。故意不挂进 AppModule(不污染正式 API),
// 只在 scripts/day09-try.mjs 里临时组装进来。
@Module({
  controllers: [ScopeDemoController],
  providers: [SingletonCounter, RequestCounter, TransientCounter, ReportService],
})
export class ScopeDemoModule {}
