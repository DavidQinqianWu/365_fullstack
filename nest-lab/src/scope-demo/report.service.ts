import { Injectable } from '@nestjs/common';
import { RequestCounter, TransientCounter } from './counters.js';

// 注意:这里没有写 scope,看起来是默认的单例……
// 但它依赖了一个 REQUEST 作用域的 RequestCounter —— 观察它实际被造了几次(作用域会「传染」)。
@Injectable()
export class ReportService {
  readonly no: number;
  static created = 0;

  constructor(
    readonly requestCounter: RequestCounter,
    readonly transientCounter: TransientCounter,
  ) {
    this.no = ++ReportService.created;
    console.log(`  🆕 new ReportService #${this.no}`);
  }
}
