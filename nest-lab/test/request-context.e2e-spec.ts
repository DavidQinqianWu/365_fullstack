import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { KitchenModule } from './../src/request-context-demo/kitchen.module.js';

// Day 13:请求上下文(ALS)—— 并发请求各拿各的 requestId,不串号
@Module({ imports: [AppModule, KitchenModule] })
class KitchenTestModule {}

describe('请求上下文 (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const moduleRef = await Test.createTestingModule({ imports: [KitchenTestModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('带了 x-request-id 就沿用,并回写到响应头', async () => {
    const res = await request(app.getHttpServer()).get('/tasks').set('x-request-id', 'from-client').expect(200);
    expect(res.headers['x-request-id']).toBe('from-client');
  });

  it('没带就生成一个 UUID 回写', async () => {
    const res = await request(app.getHttpServer()).get('/tasks').expect(200);
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('并发 5 个请求:Service 深处(不传参)拿到的都是自己的 requestId', async () => {
    const server = app.getHttpServer();
    const delays = [50, 10, 40, 20, 30];
    const bodies = await Promise.all(
      delays.map((ms, i) =>
        request(server).get(`/kitchen/cook?ms=${ms}`).set('x-request-id', `c-${i}`).then((r) => r.body),
      ),
    );
    expect(bodies.map((b) => b.requestId)).toEqual(['c-0', 'c-1', 'c-2', 'c-3', 'c-4']);
  });

  it('反面教材:单例字段存 requestId 会串号,ALS 不会', async () => {
    const server = app.getHttpServer();
    const [slow, fast] = await Promise.all([
      request(server).get('/kitchen/bad?ms=60').set('x-request-id', 'slow').then((r) => r.body),
      request(server).get('/kitchen/bad?ms=10').set('x-request-id', 'fast').then((r) => r.body),
    ]);
    expect(slow.alsSays).toBe('slow');
    expect(slow.fieldSays).toBe('fast'); // 被后进门的 fast 覆盖了
    expect(fast.alsSays).toBe('fast');
  });
});
