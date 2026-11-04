import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { ProblemDemoModule } from './../src/problem-demo/problem-demo.module.js';

// Day 17:所有错误都是同一种结构的 RFC 9457 problem+json
@Module({ imports: [AppModule, ProblemDemoModule] })
class ProblemTestModule {}

const KEY = { 'x-demo-key': 'let-me-in' };
const P = 'https://nest-lab.example/problems/';

describe('problem+json (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const moduleRef = await Test.createTestingModule({ imports: [ProblemTestModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  const cases: [string, () => request.Test, number, string][] = [
    ['422', () => request(app.getHttpServer()).post('/tasks').set(KEY).send({ title: ' ' }), 422, 'validation-error'],
    ['400 JSON', () => request(app.getHttpServer()).post('/tasks').set({ ...KEY, 'content-type': 'application/json' }).send('{bad'), 400, 'bad-request'],
    ['403', () => request(app.getHttpServer()).post('/tasks').send({ title: 'x' }), 403, 'forbidden'],
    ['404', () => request(app.getHttpServer()).get('/tasks/999'), 404, 'not-found'],
    ['405', () => request(app.getHttpServer()).patch('/tasks').set(KEY).send({ title: 'x' }), 405, 'method-not-allowed'],
    ['406', () => request(app.getHttpServer()).get('/tasks/1').set('accept', 'application/xml'), 406, 'not-acceptable'],
    ['409', () => request(app.getHttpServer()).patch('/tasks/1').set(KEY).send({ title: '改名' }), 409, 'conflict/task-completed'],
    ['415', () => request(app.getHttpServer()).post('/tasks').set({ ...KEY, 'content-type': 'text/plain' }).send('hi'), 415, 'unsupported-media-type'],
    ['500', () => request(app.getHttpServer()).get('/problem-demo/boom'), 500, 'internal'],
  ];

  it.each(cases)('%s → 结构统一、Content-Type 正确、requestId 与响应头一致', async (_name, send, status, slug) => {
    const res = await send().expect(status).expect('content-type', /^application\/problem\+json/);
    expect(res.body).toMatchObject({ type: P + slug, status, instance: expect.any(String), detail: expect.any(String) });
    expect(typeof res.body.title).toBe('string');
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
    expect(res.body).not.toHaveProperty('statusCode');
  });

  it('JSON 语法错误时也沿用客户端给的 x-request-id(Day 16 发现的 null 已修复)', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set({ ...KEY, 'content-type': 'application/json', 'x-request-id': 'trace-400' })
      .send('{bad')
      .expect(400);
    expect(res.body.requestId).toBe('trace-400');
    expect(res.headers['x-request-id']).toBe('trace-400');
  });

  it('422 带字段级 errors(JSON Pointer)', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set(KEY)
      .send({ title: 'x', checklist: [{ text: 'a', done: true }, { text: 'b', done: 'no' }] })
      .expect(422);
    expect(res.body.errors).toEqual([{ pointer: '#/checklist/1/done', detail: 'done must be a boolean value' }]);
  });

  it('500 不泄露内部信息', async () => {
    const res = await request(app.getHttpServer()).get('/problem-demo/boom').expect(500);
    expect(res.text).not.toMatch(/hunter2|10\.0\.3\.7|ECONNREFUSED/);
  });
});
