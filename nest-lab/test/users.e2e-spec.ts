import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { SerializationDemoModule } from './../src/serialization-demo/serialization-demo.module.js';
import { configureApp } from './../src/app.setup.js';

// Day 18:响应 DTO —— 不该出门的字段,任何接口、任何视图都不能出门
@Module({ imports: [AppModule, SerializationDemoModule] })
class UsersTestModule {}

const KEY = { 'x-demo-key': 'let-me-in' };

describe('响应 DTO (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const moduleRef = await Test.createTestingModule({ imports: [UsersTestModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app); // Day 19:开启 URI 版本化(和 main.ts 一样)
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  const server = () => app.getHttpServer();

  it.each([
    ['GET /users', () => request(server()).get('/users')],
    ['GET /users(admin 视图)', () => request(server()).get('/users').set('x-demo-role', 'admin')],
    ['GET /users/1', () => request(server()).get('/users/1')],
    ['GET /users/1(admin 视图)', () => request(server()).get('/users/1').set('x-demo-role', 'admin')],
  ])('%s:响应里绝不出现 passwordHash / password', async (_name, send) => {
    const res = await send().expect(200);
    expect(res.text).not.toMatch(/password/i);
  });

  it('POST /users:201 + Location,响应里没有密码相关字段;邮箱被规范化', async () => {
    const res = await request(server())
      .post('/users')
      .set({ ...KEY, 'x-demo-role': 'admin' })
      .send({ email: ' Dave@Example.com ', displayName: 'Dave', password: 'dave-secret-1' })
      .expect(201);
    expect(res.headers.location).toBe(`/users/${res.body.id}`);
    expect(res.text).not.toMatch(/password/i);
    expect(res.body.email).toBe('dave@example.com');
  });

  it('POST /users 带 passwordHash / id 字段 → 422(进口报关单不收这些栏目)', async () => {
    await request(server())
      .post('/users')
      .set(KEY)
      .send({ email: 'eve@example.com', displayName: 'Eve', password: 'eve-secret-1', passwordHash: 'x', id: 1 })
      .expect(422);
  });

  it('普通视图:email 打码、没有 internalNote;admin 视图:完整 email + internalNote', async () => {
    const user = (await request(server()).get('/users/1')).body;
    const admin = (await request(server()).get('/users/1').set('x-demo-role', 'admin')).body;
    expect(user).toEqual({ id: 1, email: 'a***@example.com', displayName: 'Alice', role: 'admin', createdAt: expect.any(String) });
    expect(admin).toMatchObject({ email: 'alice@example.com', internalNote: '创始成员,负责审批' });
  });

  it('对照组:直接返回内部对象会泄露;黑名单泄露 internalNote;白名单不泄露', async () => {
    expect((await request(server()).get('/serialization-demo/raw')).body).toHaveProperty('passwordHash');
    const blacklist = (await request(server()).get('/serialization-demo/blacklist')).body;
    expect(blacklist).not.toHaveProperty('passwordHash');
    expect(blacklist).toHaveProperty('internalNote');
    const whitelist = (await request(server()).get('/serialization-demo/whitelist')).body;
    expect(Object.keys(whitelist).sort()).toEqual(['createdAt', 'displayName', 'email', 'id', 'role']);
  });

  it('坑:ClassSerializerInterceptor 只认 class 实例 —— 返回普通对象时黑名单失效、白名单变空', async () => {
    expect((await request(server()).get('/serialization-demo/blacklist-plain')).body).toHaveProperty('passwordHash');
    expect((await request(server()).get('/serialization-demo/whitelist-plain')).body).toEqual({});
    const typed = (await request(server()).get('/serialization-demo/whitelist-plain-typed')).body;
    expect(typed).not.toHaveProperty('passwordHash');
    expect(typed).toHaveProperty('email');
  });
});
