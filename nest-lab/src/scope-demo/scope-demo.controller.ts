import { Controller, Get } from '@nestjs/common';
import { SingletonCounter, TransientCounter } from './counters.js';
import { ReportService } from './report.service.js';

// 一个请求进来,把「这次请求里各个依赖是第几号实例」报出来。
@Controller('scope-demo')
export class ScopeDemoController {
  static created = 0;
  readonly no: number;

  constructor(
    private readonly singleton: SingletonCounter,
    private readonly transient: TransientCounter,
    private readonly report: ReportService,
  ) {
    this.no = ++ScopeDemoController.created;
    console.log(`  🆕 new ScopeDemoController #${this.no}`);
  }

  @Get()
  whoAmI() {
    return {
      controller: this.no,
      singleton: this.singleton.no,
      request: this.report.requestCounter.no,
      transientInController: this.transient.no,
      transientInReport: this.report.transientCounter.no,
      report: this.report.no,
    };
  }
}
