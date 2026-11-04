import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  // 开店:Nest 读 AppModule 这张总编制表,招人、接线、登记路由
  const app = await NestFactory.create(AppModule);
  // 挂上全局店规:middleware + 计时 interceptor + 异常 filter(Day 10)
  configureApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
