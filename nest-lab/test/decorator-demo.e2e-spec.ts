import { Test } from '@nestjs/testing';
import { INestApplication, type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './../src/config/env.schema.js';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DemoKeyGuard } from './../src/common/demo-key.guard.js';
import { RequestContextMiddleware } from './../src/common/request-context/request-context.middleware.js';
import { RequestContextModule } from './../src/common/request-context/request-context.module.js';
import { DecoratorDemoModule } from './../src/decorator-demo/decorator-demo.module.js';
import { configureApp } from './../src/app.setup.js';

// Day 13:@RequestId() 改为读 ALS 里的桌号牌,所以测试模块也要挂上 RequestContextMiddleware
@Module({
  // Day 12:DemoKeyGuard 要 ConfigService;ignoreEnvFile 保证不读本机 .env
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, ignoreEnvFile: true }),
    RequestContextModule,
    DecoratorDemoModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: DemoKeyGuard }], // 和 AppModule 一样挂上全局保安
})
class DecoratorTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}

// Day 11:元数据「贴在哪、怎么读、读错了会怎样」
describe('自定义装饰器 (e2e)', () => {
  let app: INestApplication<App>;
  const KEY = { 'x-demo-key': 'let-me-in' };

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const moduleRef = await Test.createTestingModule({ imports: [DecoratorTestModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app); // Day 19:开启 URI 版本化(和 main.ts 一样)
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('@Public() + @RequestId():不带钥匙 200,沿用客户端给的 x-request-id', async () => {
    const res = await request(app.getHttpServer()).get('/decorator-demo/open').set('x-request-id', 'abc').expect(200);
    expect(res.body).toEqual({ requestId: 'abc' });
  });

  it('@RequestId() 每个请求执行一次:不带头时两次拿到不同的 ID', async () => {
    const a = (await request(app.getHttpServer()).get('/decorator-demo/open')).body.requestId;
    const b = (await request(app.getHttpServer()).get('/decorator-demo/open')).body.requestId;
    expect(a).not.toBe(b);
  });

  it('拼错 key 的 SetMetadata("isPubilc") 静默失效:不带钥匙仍然 403', () => {
    return request(app.getHttpServer()).get('/decorator-demo/typo').expect(403);
  });

  it('类级别 [staff]:staff 能进 staff-zone', () => {
    return request(app.getHttpServer())
      .get('/decorator-demo/staff-zone')
      .set({ ...KEY, 'x-demo-role': 'staff' })
      .expect(200);
  });

  it('方法级别 [admin] 覆盖类级别:staff 进不了 admin-zone,admin 能进', async () => {
    await request(app.getHttpServer())
      .get('/decorator-demo/admin-zone')
      .set({ ...KEY, 'x-demo-role': 'staff' })
      .expect(403);
    await request(app.getHttpServer())
      .get('/decorator-demo/admin-zone')
      .set({ ...KEY, 'x-demo-role': 'admin' })
      .expect(200);
  });
});
