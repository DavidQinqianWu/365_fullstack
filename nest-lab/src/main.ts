import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { AddressInfo } from 'node:net';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './config/env.schema.js';

async function bootstrap() {
  // 开店:Nest 读 AppModule 这张总编制表,招人、接线、登记路由。
  // Day 12:开店前先过「开店检查单」(ConfigModule + zod),环境变量不合格,这一步就直接抛错退出
  const app = await NestFactory.create(AppModule);
  // 挂上全局店规:middleware + 计时 interceptor + 异常 filter(Day 10)
  configureApp(app);

  const config = app.get(ConfigService<Env, true>);
  const port = config.get('PORT', { infer: true }); // number,不是字符串
  await app.listen(port);
  const actual = (app.getHttpServer().address() as AddressInfo).port; // PORT=0 时由系统挑
  console.log(`🚀 nest-lab 已开门:http://localhost:${actual}(NODE_ENV=${config.get('NODE_ENV', { infer: true })})`);
}
await bootstrap();
