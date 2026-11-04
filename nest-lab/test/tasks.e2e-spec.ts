import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
        data: { id: 1, title: '跑通 nest new', done: true, checklist: [], createdAt: FIXED },
        timestamp: FIXED,
      });
  });

  it('所有经过 interceptor 的响应都带 X-Response-Time 头', async () => {
    const res = await request(app.getHttpServer()).get('/tasks').expect(200);
    expect(res.headers['x-response-time']).toMatch(/^\d+\.\d+ms$/);
  });

  it('GET /tasks/999 → 404 problem+json(全局 filter 的统一错误格式,不被包装)', () => {
    return request(app.getHttpServer())
      .get('/tasks/999')
      .set('x-request-id', 'e2e-404') // Day 13:错误体带上 requestId
      .expect(404)
      .expect('content-type', /application\/problem\+json/) // Day 17:RFC 9457
      .expect({
        type: 'https://nest-lab.example/problems/not-found',
        title: '资源不存在',
        status: 404,
        detail: '没有 id 为 999 的任务',
        instance: '/tasks/999',
        requestId: 'e2e-404',
      });
  });

  it('GET /tasks/abc → 400(ParseIntPipe 拦下,Controller 不会执行)', async () => {
    const res = await request(app.getHttpServer()).get('/tasks/abc').expect(400);
    expect(res.body).toEqual({
      type: 'https://nest-lab.example/problems/bad-request',
      title: '请求格式错误',
      status: 400,
      detail: 'Validation failed (numeric string is expected)',
      instance: '/tasks/abc',
      requestId: res.headers['x-request-id'], // Day 13:没带头时服务端生成,响应头和错误体是同一个
    });
  });

  it('POST /tasks 不带 x-demo-key → 403,而且没有 X-Response-Time(Guard 在 interceptor 之前)', async () => {
    const res = await request(app.getHttpServer()).post('/tasks').send({ title: '没钥匙' }).expect(403);
    expect(res.body).toEqual({
      type: 'https://nest-lab.example/problems/forbidden',
      title: '没有权限执行此操作',
      status: 403,
      detail: 'Forbidden resource',
      instance: '/tasks',
      requestId: res.headers['x-request-id'],
    });
    expect(res.headers['x-response-time']).toBeUndefined();
  });

  it('POST /tasks 带钥匙 → 201 + 新任务,之后能 GET 到', async () => {
    const created = await request(app.getHttpServer())
      .post('/tasks')
      .set(KEY)
      .send({ title: '写 e2e 测试' })
      .expect(201);
    expect(created.body.data).toEqual({ id: 3, title: '写 e2e 测试', done: false, checklist: [], createdAt: FIXED });

    await request(app.getHttpServer()).get('/tasks/3').expect(200);
  });

  // ---------- Day 11:全局保安 + @Public() + @AdminOnly() ----------
  it('GET 接口贴了 @Public():不带钥匙也是 200', () => {
    return request(app.getHttpServer()).get('/tasks').expect(200);
  });

  it('DELETE /tasks/1 带钥匙但没有 admin 角色 → 403(RolesGuard 拦下)', async () => {
    await request(app.getHttpServer()).delete('/tasks/1').set(KEY).expect(403);
    await request(app.getHttpServer()).delete('/tasks/1').set({ ...KEY, 'x-demo-role': 'staff' }).expect(403);
  });

  it('DELETE /tasks/1 不带钥匙,即使是 admin → 403(全局保安先拦下)', () => {
    return request(app.getHttpServer()).delete('/tasks/1').set({ 'x-demo-role': 'admin' }).expect(403);
  });

  it('DELETE /tasks/1 钥匙 + admin → 204 没有响应体(Day 15),之后 GET 是 404', async () => {
    const res = await request(app.getHttpServer())
      .delete('/tasks/1')
      .set({ ...KEY, 'x-demo-role': 'admin' })
      .expect(204);
    expect(res.text).toBe('');
    await request(app.getHttpServer()).get('/tasks/1').expect(404);
  });
});

// ---------- Day 12:测试里覆盖配置 ----------
describe('Tasks (e2e) · 覆盖配置', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      // 把整个 ConfigService 换成一个只认这几项配置的实例(Day 9 的 overrideProvider,换的是配置)
      .overrideProvider(ConfigService)
      .useValue(new ConfigService({ NODE_ENV: 'test', PORT: 0, DEMO_KEY: 'e2e-secret-key', LOG_REQUESTS: false }))
      .compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('钥匙来自配置:默认的 let-me-in 不再好使,配置里的 e2e-secret-key 才行', async () => {
    await request(app.getHttpServer()).post('/tasks').set('x-demo-key', 'let-me-in').send({ title: 'x' }).expect(403);
    await request(app.getHttpServer()).post('/tasks').set('x-demo-key', 'e2e-secret-key').send({ title: 'x' }).expect(201);
  });
});
