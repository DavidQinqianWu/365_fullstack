import { Injectable, Scope } from '@nestjs/common';

// Day 9 作用域实验:三个一模一样的「计数员」,只有 scope 不同。
// 每 new 一次,就给这个类的计数器 +1,并打印一行 🆕,让你数清楚到底造了几个。
export const created: Record<string, number> = {};

function born(name: string): number {
  created[name] = (created[name] ?? 0) + 1;
  console.log(`  🆕 new ${name} #${created[name]}`);
  return created[name];
}

// 默认作用域 = 单例(singleton):整个应用只造一次,开业时就造好
@Injectable()
export class SingletonCounter {
  readonly no = born('SingletonCounter');
}

// 请求作用域:每个 HTTP 请求造一个新的,请求结束就丢掉
@Injectable({ scope: Scope.REQUEST })
export class RequestCounter {
  readonly no = born('RequestCounter');
}

// 瞬时作用域:每个「需要它的人」各拿一个新的(注入几处就造几个)
@Injectable({ scope: Scope.TRANSIENT })
export class TransientCounter {
  readonly no = born('TransientCounter');
}
