import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { CLOCK } from './../src/common/clock.js';

// Day 9:把时钟换成固定时间,createdAt / timestamp 才能写死断言
const FIXED = '2026-01-01T00:00:00.000Z';
const KEY = { 'x-demo-key': 'let-me-in' }; // Day 10:POST /tasks 要过 DemoKeyGuard

// e2e 测试:真的起一个 Nest 应用(不占端口,supertest 直接把请求喂给 http.Server),
// 从 HTTP 这一层验证「路由 → 管线 → Controller → Service → 状态码 / JSON」整条链路。
describe('Tasks (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {}); // 想看请求流过的顺序就注释掉这一行
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CLOCK)
      .useValue({ now: () => new Date(FIXED) })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app); // Day 10:e2e 不走 main.ts,全局切面要在这里同样挂上
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('GET /tasks → 200 + { data: 任务数组, timestamp }', async () => {
    const res = await request(app.getHttpServer()).get('/tasks').expect(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.timestamp).toBe(FIXED);
  });

  it('GET /tasks/1 → 200 + 包装后的单个任务', () => {
    return request(app.getHttpServer())
      .get('/tasks/1')
      .expect(200)
      .expect({
        data: { id: 1, title: '跑通 nest new', done: true, createdAt: FIXED },
        timestamp: FIXED,
      });
  });

  it('所有经过 interceptor 的响应都带 X-Response-Time 头', async () => {
    const res = await request(app.getHttpServer()).get('/tasks').expect(200);
    expect(res.headers['x-response-time']).toMatch(/^\d+\.\d+ms$/);
  });

  it('GET /tasks/999 → 404(全局 filter 的统一错误格式,不被包装)', () => {
    return request(app.getHttpServer())
      .get('/tasks/999')
      .expect(404)
      .expect({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: '没有 id 为 999 的任务',
        path: '/tasks/999',
      });
  });

  it('GET /tasks/abc → 400(ParseIntPipe 拦下,Controller 不会执行)', async () => {
    const res = await request(app.getHttpServer()).get('/tasks/abc').expect(400);
    expect(res.body).toEqual({
      statusCode: 400,
      error: 'BAD_REQUEST',
      message: 'Validation failed (numeric string is expected)',
      path: '/tasks/abc',
    });
  });

  it('POST /tasks 不带 x-demo-key → 403,而且没有 X-Response-Time(Guard 在 interceptor 之前)', async () => {
    const res = await request(app.getHttpServer()).post('/tasks').send({ title: '没钥匙' }).expect(403);
    expect(res.body).toEqual({ statusCode: 403, error: 'FORBIDDEN', message: 'Forbidden resource', path: '/tasks' });
    expect(res.headers['x-response-time']).toBeUndefined();
  });

  it('POST /tasks 带钥匙 → 201 + 新任务,之后能 GET 到', async () => {
    const created = await request(app.getHttpServer())
      .post('/tasks')
      .set(KEY)
      .send({ title: '写 e2e 测试' })
      .expect(201);
    expect(created.body.data).toEqual({ id: 3, title: '写 e2e 测试', done: false, createdAt: FIXED });

    await request(app.getHttpServer()).get('/tasks/3').expect(200);
  });
});
