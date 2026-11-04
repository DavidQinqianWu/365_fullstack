import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { ScopeDemoModule } from './../src/scope-demo/scope-demo.module.js';

// Day 9:用测试把三种作用域的规律钉死
describe('Provider 作用域 (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const moduleRef = await Test.createTestingModule({ imports: [ScopeDemoModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('singleton 永远同一个;request 每次请求一个新的;依赖 request 的 Controller 也被「传染」', async () => {
    const first = (await request(app.getHttpServer()).get('/scope-demo').expect(200)).body;
    const second = (await request(app.getHttpServer()).get('/scope-demo').expect(200)).body;

    expect(second.singleton).toBe(first.singleton); // 单例:不变
    expect(second.request).toBe(first.request + 1); // 请求作用域:每次 +1
    expect(second.report).toBe(first.report + 1); // 没写 scope 的 ReportService 也被传染
    expect(second.controller).toBe(first.controller + 1); // Controller 也被传染
    // 瞬时作用域:同一个请求里,Controller 和 ReportService 拿到的不是同一个
    expect(second.transientInController).not.toBe(second.transientInReport);
  });
});
