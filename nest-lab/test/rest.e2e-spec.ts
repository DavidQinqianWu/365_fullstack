import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { CLOCK } from './../src/common/clock.js';

// Day 15:HTTP 语义与 REST —— 方法、状态码、响应头、内容协商
const FIXED = '2026-01-01T00:00:00.000Z';
const KEY = { 'x-demo-key': 'let-me-in' };

describe('REST 语义 (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLOCK)
      .useValue({ now: () => new Date(FIXED) })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('POST → 201 + Location 指向新资源,顺着 Location 能 GET 到', async () => {
    const res = await request(app.getHttpServer()).post('/tasks').set(KEY).send({ title: '学 REST' }).expect(201);
    expect(res.headers.location).toBe('/tasks/3');
    const got = await request(app.getHttpServer()).get(res.headers.location).expect(200);
    expect(got.body.title).toBe('学 REST');
  });

  it('POST 不幂等:同一个请求发两次,建出两条', async () => {
    const server = app.getHttpServer();
    const a = await request(server).post('/tasks').set(KEY).send({ title: '买牛奶' }).expect(201);
    const b = await request(server).post('/tasks').set(KEY).send({ title: '买牛奶' }).expect(201);
    expect(a.body.id).not.toBe(b.body.id);
    expect((await request(server).get('/tasks')).body).toHaveLength(4);
  });

  it('PUT 是整体替换:缺字段 422(Day 16 起);完整表示 200;同一请求重复发结果不变(幂等)', async () => {
    const server = app.getHttpServer();
    await request(server).put('/tasks/2').set(KEY).send({ title: '只给标题' }).expect(422);
    const body = { title: '整体替换', done: true };
    const first = await request(server).put('/tasks/2').set(KEY).send(body).expect(200);
    const second = await request(server).put('/tasks/2').set(KEY).send(body).expect(200);
    expect(second.body).toEqual(first.body);
    expect(first.body).toEqual({ id: 2, title: '整体替换', done: true, checklist: [], createdAt: FIXED });
  });

  it('PATCH 是部分更新:只给 done,标题不变', async () => {
    const res = await request(app.getHttpServer()).patch('/tasks/2').set(KEY).send({ done: true }).expect(200);
    expect(res.body).toEqual({
      id: 2,
      title: '看懂 Module / Controller / Provider',
      done: true,
      checklist: [],
      createdAt: FIXED,
    });
  });

  it('409:已完成的任务不能改标题;同时把 done 改回 false 就可以', async () => {
    const server = app.getHttpServer();
    await request(server).patch('/tasks/1').set(KEY).send({ title: '改名' }).expect(409);
    await request(server).patch('/tasks/1').set(KEY).send({ title: '改名', done: false }).expect(200);
  });

  it('405 + Allow:路径存在但方法不支持', async () => {
    const res = await request(app.getHttpServer()).patch('/tasks').set(KEY).send({ title: 'x' }).expect(405);
    expect(res.headers.allow).toBe('GET, HEAD, POST, OPTIONS');
  });

  it('OPTIONS → 204 + Allow', async () => {
    const res = await request(app.getHttpServer()).options('/tasks/1').expect(204);
    expect(res.headers.allow).toBe('GET, HEAD, PUT, PATCH, DELETE, OPTIONS');
  });

  it('不存在的路径仍然是 404', () => {
    return request(app.getHttpServer()).get('/nope').expect(404);
  });

  it('406:Accept 只要 XML;带上 */* 兜底就 200', async () => {
    await request(app.getHttpServer()).get('/tasks/1').set('accept', 'application/xml').expect(406);
    await request(app.getHttpServer()).get('/tasks/1').set('accept', 'application/xml, */*;q=0.1').expect(200);
  });

  it('415:写请求的请求体不是 JSON', () => {
    return request(app.getHttpServer())
      .post('/tasks')
      .set({ ...KEY, 'content-type': 'text/plain' })
      .send('hello')
      .expect(415);
  });

  it('422:请求体是 JSON 但内容不对(Day 16:DTO + ValidationPipe);400:JSON 语法坏了', async () => {
    await request(app.getHttpServer()).post('/tasks').set(KEY).send({ title: '' }).expect(422);
    await request(app.getHttpServer()).patch('/tasks/2').set(KEY).send({}).expect(422);
    await request(app.getHttpServer())
      .post('/tasks')
      .set({ ...KEY, 'content-type': 'application/json' })
      .send('{bad json')
      .expect(400);
  });
});
