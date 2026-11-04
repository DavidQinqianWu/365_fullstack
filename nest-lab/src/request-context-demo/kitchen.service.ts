import { Injectable } from '@nestjs/common';
import { setTimeout as sleep } from 'node:timers/promises';
import { ctxLog } from '../common/request-context/request-context.js';
import { RequestContextService } from '../common/request-context/request-context.service.js';

// ✅ 正确写法:方法签名里没有 requestId,深处要用时问 RequestContextService(背后是 ALS)
@Injectable()
export class KitchenService {
  constructor(private readonly context: RequestContextService) {}

  async cook(ms: number): Promise<{ requestId: string | undefined; ms: number }> {
    ctxLog(`   ④ Kitchen 开始做菜(要等 ${ms} ms)`);
    await sleep(ms / 2); // 模拟查数据库:await 期间服务员去接待别的请求了(Day 1–2)
    ctxLog('   ④ Kitchen 查完库存');
    await sleep(ms / 2); // 模拟调第三方接口
    ctxLog('   ④ Kitchen 出菜');
    return { requestId: this.context.requestId, ms };
  }
}

// ❌ 故意写坏:把「当前请求的 ID」存在单例的字段上(Day 9 警告过)
// 所有并发请求共用这一个实例,await 一让出,下一个请求就把字段覆盖了
@Injectable()
export class BadKitchenService {
  private currentRequestId: string | undefined;

  constructor(private readonly context: RequestContextService) {}

  async cook(ms: number): Promise<{ fieldSays: string | undefined; alsSays: string | undefined }> {
    this.currentRequestId = this.context.requestId; // 进门时记在字段上
    await sleep(ms);
    // 等回来以后再读字段 —— 已经被别的请求改掉了吗?
    return { fieldSays: this.currentRequestId, alsSays: this.context.requestId };
  }
}
