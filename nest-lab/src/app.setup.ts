import type { INestApplication } from '@nestjs/common';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { requestLogger } from './common/request-logger.middleware.js';
import { TimingInterceptor } from './common/timing.interceptor.js';

// 全局的「店规」放在一个函数里:main.ts、e2e 测试、观察脚本都调用它。
// 为什么不直接写在 main.ts?—— e2e 测试和脚本不走 main.ts,写在那里测试就测不到这些全局切面。
export function configureApp(app: INestApplication): INestApplication {
  app.use(requestLogger); // ① 全局 middleware(Day 8)
  app.useGlobalInterceptors(new TimingInterceptor()); // 全局 interceptor:所有接口计时
  app.useGlobalFilters(new AllExceptionsFilter()); // 全局 filter:所有异常统一格式
  return app;
}
