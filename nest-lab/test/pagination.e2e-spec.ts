import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { TasksService } from './../src/tasks/tasks.service.js';

// Day 19:分页、过滤、排序与版本化
const KEY = { 'x-demo-key': 'let-me-in' };

describe('分页 / 过滤 / 排序 / 版本化 (e2e)', () => {
  let app: INestApplication<App>;
  let tasks: TasksService;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    tasks = app.get(TasksService);
    for (let i = 3; i <= 30; i++) {
      const t = tasks.create({ title: `任务 ${String(i).padStart(2, '0')}` });
      if (i % 3 === 0) tasks.update(t.id, { done: true });
    }
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  const server = () => app.getHttpServer();

  async function walk(query: string): Promise<number[]> {
    const seen: number[] = [];
    let cursor: string | null = null;
    do {
      const res: request.Response = await request(server())
        .get(`/v2/tasks?${query}${cursor ? `&cursor=${cursor}` : ''}`)
        .expect(200);
      seen.push(...res.body.items.map((t: { id: number }) => t.id));
      cursor = res.body.nextCursor;
    } while (cursor);
    return seen;
  }

  it('默认 limit=20,集合响应是 { items, nextCursor },没有 total', async () => {
    const res = await request(server()).get('/v2/tasks').expect(200);
    expect(res.body.items).toHaveLength(20);
    expect(typeof res.body.nextCursor).toBe('string');
    expect(Object.keys(res.body).sort()).toEqual(['items', 'nextCursor']);
  });

  it('cursor 一路翻到底:每条恰好一次(createdAt 有大量相同值,靠 id 兜底)', async () => {
    const seen = await walk('sort=-createdAt&limit=7');
    expect(seen).toHaveLength(30);
    expect(new Set(seen).size).toBe(30);
  });

  it('翻页途中新增 / 删除:cursor 不重不漏', async () => {
    const first = await request(server()).get('/v2/tasks?sort=-id&limit=10').expect(200);
    const firstIds = first.body.items.map((t: { id: number }) => t.id);
    tasks.create({ title: '中途新增' });
    tasks.remove(firstIds[0]);
    const second = await request(server()).get(`/v2/tasks?sort=-id&limit=10&cursor=${first.body.nextCursor}`).expect(200);
    const secondIds = second.body.items.map((t: { id: number }) => t.id);
    expect(secondIds).toEqual([20, 19, 18, 17, 16, 15, 14, 13, 12, 11]);
  });

  it('对照:offset 在中途新增时会重复', () => {
    const p1 = tasks.listByOffset({ sort: ['-id'], offset: 0, limit: 10 }).map((t) => t.id);
    tasks.create({ title: '中途新增' });
    const p2 = tasks.listByOffset({ sort: ['-id'], offset: 10, limit: 10 }).map((t) => t.id);
    expect(p2.filter((id) => p1.includes(id))).toEqual([21]);
  });

  it('过滤 + 排序:done=false&q=任务 2&sort=-title', async () => {
    const res = await request(server()).get('/v2/tasks?done=false&q=任务 2&sort=-title').expect(200);
    const titles = res.body.items.map((t: { title: string }) => t.title);
    expect(titles).toEqual(['任务 29', '任务 28', '任务 26', '任务 25', '任务 23', '任务 22', '任务 20']);
  });

  it.each([
    ['limit=500', 422],
    ['limit=0', 422],
    ['limit=abc', 422],
    ['sort=passwordHash', 422],
    ['done=yes', 422],
    ['page=2', 422],
    ['cursor=abc', 400],
  ])('非法参数 %s → %i(problem+json)', async (query, status) => {
    const res = await request(server()).get(`/v2/tasks?${query}`).expect(status);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });

  it('换了 sort 还用旧 cursor → 400 invalid-cursor', async () => {
    const first = await request(server()).get('/v2/tasks?sort=-id&limit=5').expect(200);
    const res = await request(server()).get(`/v2/tasks?sort=id&limit=5&cursor=${first.body.nextCursor}`).expect(400);
    expect(res.body.type).toBe('https://nest-lab.example/problems/invalid-cursor');
  });

  it('v1:旧格式 { data, timestamp } + Deprecation / Sunset / Link 头;v2 与不带版本的 /tasks 是新格式', async () => {
    const v1 = await request(server()).get('/v1/tasks/1').expect(200);
    expect(Object.keys(v1.body).sort()).toEqual(['data', 'timestamp']);
    expect(v1.headers.deprecation).toBe('@1793750400');
    expect(v1.headers.sunset).toBe('Sat, 01 May 2027 00:00:00 GMT');
    expect(v1.headers.link).toContain('rel="successor-version"');

    const v2 = await request(server()).get('/v2/tasks/1').expect(200);
    expect(v2.body).toHaveProperty('title');
    expect(v2.headers.deprecation).toBeUndefined();
    const neutral = await request(server()).get('/tasks/1').expect(200);
    expect(neutral.body).toEqual(v2.body);
  });

  it('v1 列表不分页(一次全给);v2 默认只给 20 条', async () => {
    expect((await request(server()).get('/v1/tasks').expect(200)).body.data).toHaveLength(30);
    expect((await request(server()).get('/v2/tasks').expect(200)).body.items).toHaveLength(20);
  });

  it('写接口只在 v2:POST /v2/tasks 201,Location 不带版本前缀', async () => {
    const res = await request(server()).post('/v2/tasks').set(KEY).send({ title: '来自 v2' }).expect(201);
    expect(res.headers.location).toBe('/tasks/31');
  });
});
