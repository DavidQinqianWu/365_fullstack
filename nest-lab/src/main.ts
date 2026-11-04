import { ConfigService } from '@nestjs/config';
import type { AddressInfo } from 'node:net';
import { createApp } from './app.factory.js';
import type { Env } from './config/env.schema.js';

async function bootstrap() {
  // 开店:Nest 读 AppModule 这张总编制表,招人、接线、登记路由。
  // Day 12:开店前先过「开店检查单」(ConfigModule + zod),环境变量不合格,这一步就直接抛错退出
  // Day 19:统一走 createApp(内部调用 configureApp,开启 URI 版本化)
  const app = await createApp();

  const config = app.get(ConfigService<Env, true>);
  const port = config.get('PORT', { infer: true }); // number,不是字符串
  await app.listen(port);
  const actual = (app.getHttpServer().address() as AddressInfo).port; // PORT=0 时由系统挑
  console.log(`🚀 nest-lab 已开门:http://localhost:${actual}(NODE_ENV=${config.get('NODE_ENV', { infer: true })})`);
}
await bootstrap();
