import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { requestLogger } from './common/request-logger.middleware.js';

async function bootstrap() {
  // 开店:Nest 读 AppModule 这张总编制表,招人、接线、登记路由
  const app = await NestFactory.create(AppModule);
  // 全局 middleware:每个请求进门第一站
  app.use(requestLogger);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
