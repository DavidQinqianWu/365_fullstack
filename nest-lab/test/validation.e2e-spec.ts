import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';

// Day 16:DTO + 全局 ValidationPipe(APP_PIPE)—— 报关单的每一条规则
const KEY = { 'x-demo-key': 'let-me-in' };

describe('DTO 校验 (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app); // Day 19:开启 URI 版本化(和 main.ts 一样)
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  const post = (body: unknown) => request(app.getHttpServer()).post('/tasks').set(KEY).send(body as object);

  it('Day 8 的老坑补上了:POST {} → 422', async () => {
    const res = await post({}).expect(422);
    expect(res.body.errors).toContainEqual({ pointer: '#/title', detail: 'title must be a string' });
  });

  it('自定义校验器 @IsNotBlank:全是空白 → 422', async () => {
    const res = await post({ title: '   ' }).expect(422);
    expect(res.body.errors).toEqual([{ pointer: '#/title', detail: 'title 不能为空或全是空白' }]);
  });

  it('防批量赋值:id、done 不在 CreateTaskDto 里 → 422(forbidNonWhitelisted)', async () => {
    const res = await post({ title: 'x', id: 99, done: true }).expect(422);
    expect(res.body.errors).toEqual([
      { pointer: '#/id', detail: 'property id should not exist' },
      { pointer: '#/done', detail: 'property done should not exist' },
    ]);
  });

  it('嵌套数组:checklist 第 2 项不合法,pointer 精确到 #/checklist/1/xxx(Day 17)', async () => {
    const res = await post({ title: 'x', checklist: [{ text: 'a', done: true }, { text: ' ', done: 'no' }] }).expect(422);
    expect(res.body.errors).toEqual([
      { pointer: '#/checklist/1/text', detail: 'text 不能为空或全是空白' },
      { pointer: '#/checklist/1/done', detail: 'done must be a boolean value' },
    ]);
  });

  it('合法请求:@Transform 去掉了首尾空格,checklist 原样保存', async () => {
    const res = await post({ title: '  带清单  ', checklist: [{ text: '买菜', done: false }] }).expect(201);
    expect(res.body).toMatchObject({ title: '带清单', done: false, checklist: [{ text: '买菜', done: false }] });
  });

  it('PUT 不给 checklist = 清空;PATCH 不给 checklist = 保留', async () => {
    const server = app.getHttpServer();
    await post({ title: '带清单', checklist: [{ text: '买菜', done: false }] }).expect(201);
    const patched = await request(server).patch('/tasks/3').set(KEY).send({ done: true }).expect(200);
    expect(patched.body.checklist).toHaveLength(1);
    const put = await request(server).put('/tasks/3').set(KEY).send({ title: '带清单', done: false }).expect(200);
    expect(put.body.checklist).toEqual([]);
  });

  it('业务规则不归 DTO 管:格式合法但违反规则 → 409(Service 抛)', () => {
    return request(app.getHttpServer()).patch('/tasks/1').set(KEY).send({ title: '改名' }).expect(409);
  });
});
