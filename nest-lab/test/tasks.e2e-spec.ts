import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { CLOCK } from './../src/common/clock.js';

// Day 9:把时钟换成固定时间,createdAt 才能写死断言
const FIXED = '2026-01-01T00:00:00.000Z';

// e2e 测试:真的起一个 Nest 应用(不占端口,supertest 直接把请求喂给 http.Server),
// 从 HTTP 这一层验证「路由 → Controller → Service → 状态码 / JSON」整条链路。
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
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('GET /tasks → 200 + 任务数组', async () => {
    const res = await request(app.getHttpServer()).get('/tasks').expect(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toHaveLength(2);
  });

  it('GET /tasks/1 → 200 + 单个任务', () => {
    return request(app.getHttpServer())
      .get('/tasks/1')
      .expect(200)
      .expect({ id: 1, title: '跑通 nest new', done: true, createdAt: FIXED });
  });

  it('GET /tasks/999 → 404(NotFoundException 被翻译成 JSON)', () => {
    return request(app.getHttpServer())
      .get('/tasks/999')
      .expect(404)
      .expect({
        message: '没有 id 为 999 的任务',
        error: 'Not Found',
        statusCode: 404,
      });
  });

  it('POST /tasks → 201 + 新任务,之后能 GET 到', async () => {
    const created = await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: '写 e2e 测试' })
      .expect(201);
    expect(created.body).toEqual({ id: 3, title: '写 e2e 测试', done: false, createdAt: FIXED });

    await request(app.getHttpServer()).get('/tasks/3').expect(200);
  });
});
