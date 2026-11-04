import { readFileSync } from 'node:fs';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OpenAPIObject } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { buildOpenApiDocument } from './../src/openapi.js';
import { toTaskResponse } from './../src/tasks/dto/task-response.js';
import { toUserResponse } from './../src/users/dto/user-response.js';

// Day 20:菜单册(OpenAPI)本身也要测 —— 它是对外契约
type Operation = { deprecated?: boolean; responses: Record<string, { content?: Record<string, unknown> }> };
const COMMITTED = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8')) as OpenAPIObject;

describe('OpenAPI 文档 (e2e)', () => {
  let app: INestApplication<App>;
  let doc: OpenAPIObject;

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    doc = buildOpenApiDocument(app);
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  const operations = () =>
    Object.entries(doc.paths).flatMap(([path, item]) =>
      Object.entries(item as Record<string, Operation>).map(([method, op]) => ({ path, method, op })),
    );

  it('提交的 openapi.json 与代码一致(代码改了却没重新生成 → 这里变红;修法:npm run openapi:generate)', () => {
    expect(doc).toEqual(COMMITTED);
  });

  it('/docs-json 能拿到同一份文档', async () => {
    const res = await request(app.getHttpServer()).get('/docs-json').expect(200);
    expect(res.body.info.title).toBe(doc.info.title);
  });

  it('每个写接口都声明了 422,内容类型是 application/problem+json', () => {
    const writes = operations().filter(({ method }) => ['post', 'put', 'patch'].includes(method));
    expect(writes.length).toBeGreaterThan(0);
    for (const { op } of writes) {
      expect(op.responses['422']?.content).toHaveProperty(['application/problem+json']);
    }
  });

  it('v1 的每个操作都标了 deprecated,v2 的都没有', () => {
    for (const { path, op } of operations()) {
      expect(Boolean(op.deprecated)).toBe(path.startsWith('/v1/'));
    }
  });

  it('文档里任何 schema 都没有 passwordHash', () => {
    expect(JSON.stringify(doc.components?.schemas)).not.toContain('passwordHash');
  });

  it('文档 schema 的字段 = 映射函数真实输出的字段(防止「忘了贴 @ApiProperty」)', () => {
    const schemas = (doc.components?.schemas ?? {}) as Record<string, { properties?: object }>;
    const props = (name: string) => Object.keys(schemas[name]?.properties ?? {}).sort();
    const task = toTaskResponse({ id: 1, title: 't', done: false, checklist: [], createdAt: '2026-01-01T00:00:00.000Z', version: 1 });
    expect(props('TaskResponse')).toEqual(Object.keys(task).sort());
    const user = toUserResponse(
      { id: 1, email: 'a@b.c', displayName: 'A', role: 'user', passwordHash: 'x', internalNote: 'n', createdAt: new Date() },
      'admin', // admin 视图字段最全
    );
    expect(props('UserResponse')).toEqual(Object.keys(user).sort());
  });
});

describe('SWAGGER_ENABLED=false 时不开放文档', () => {
  it('/docs-json → 404', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(new ConfigService({ NODE_ENV: 'production', DEMO_KEY: 'a-real-secret-key', LOG_REQUESTS: false, SWAGGER_ENABLED: false }))
      .compile();
    const app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    await request(app.getHttpServer()).get('/docs-json').expect(404);
    await app.close();
    vi.restoreAllMocks();
  });
});
