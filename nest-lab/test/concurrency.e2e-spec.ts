import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { TASKS_REPOSITORY, type TasksRepository } from './../src/tasks/tasks.repository.js';

// Day 40:并发修改同一个任务。同一套用例在内存版(npm run test:e2e)和 PostgreSQL 版(npm run test:e2e:pg)上都跑。
//
// ① 两个请求基于同一个 version 修改:只能有一个成功,另一个 409 conflict/stale-version(乐观锁)
// ② 「读到旧状态 → 判断业务规则 → 写」之间,别的请求把任务标成了已完成:改标题必须被拒绝(409 task-completed)
//    这个竞态靠真实的时间巧合很难稳定复现,所以这里把「另一个请求」精确地插进读和写之间:
//    包一层仓储的 findById,第一次被调用、读完之后,先用另一个 HTTP 请求把任务标成已完成,再把读到的(已经过时的)数据交回去
// ③ 两个 DELETE 同时到达:一个 204,一个 404
const KEY = { 'x-demo-key': 'let-me-in' };
const ADMIN = { ...KEY, 'x-demo-role': 'admin' };

describe('并发修改同一个任务 (e2e)', () => {
  let app: INestApplication<App>;
  const server = () => app.getHttpServer();

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  const createTask = async (title: string) =>
    (await request(server()).post('/v2/tasks').set(KEY).send({ title, checklist: [{ text: '步骤 1', done: false }] }).expect(201)).body as {
      id: number;
      version: number;
    };

  it('响应里带 version;每次修改成功后 version + 1', async () => {
    const t = await createTask('版本号');
    expect(t.version).toBe(1);
    const res = await request(server()).patch(`/v2/tasks/${t.id}`).set(KEY).send({ title: '版本号 2' }).expect(200);
    expect(res.body.version).toBe(2);
  });

  it('① 两个基于同一个 version 的 PATCH 同时到达:一个 200,一个 409 conflict/stale-version,不会互相覆盖', async () => {
    const t = await createTask('同时编辑');
    const [a, b] = await Promise.all([
      request(server()).patch(`/v2/tasks/${t.id}`).set(KEY).send({ title: 'A 改的标题', version: t.version }),
      request(server()).patch(`/v2/tasks/${t.id}`).set(KEY).send({ checklist: [{ text: 'B 改的清单', done: true }], version: t.version }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.type).toBe('https://nest-lab.example/problems/conflict/stale-version');
    const final = (await request(server()).get(`/v2/tasks/${t.id}`).expect(200)).body;
    expect(final.version).toBe(t.version + 1);
    // 赢的那一个的修改在,输的那一个的修改不在
    if (a.status === 200) expect(final).toMatchObject({ title: 'A 改的标题', checklist: [{ text: '步骤 1', done: false }] });
    else expect(final).toMatchObject({ title: '同时编辑', checklist: [{ text: 'B 改的清单', done: true }] });
  });

  it('① 先后两个 PUT 都基于 version 1:第二个 409,第一个的修改没有被悄悄覆盖', async () => {
    const t = await createTask('整体替换');
    await request(server()).put(`/v2/tasks/${t.id}`).set(KEY).send({ title: 'A 的版本', done: false, version: 1 }).expect(200);
    const res = await request(server()).put(`/v2/tasks/${t.id}`).set(KEY).send({ title: 'B 的版本', done: false, version: 1 }).expect(409);
    expect(res.body.type).toBe('https://nest-lab.example/problems/conflict/stale-version');
    expect((await request(server()).get(`/v2/tasks/${t.id}`)).body).toMatchObject({ title: 'A 的版本', version: 2 });
  });

  it('② 读到「未完成」之后、写之前,任务被别的请求标成已完成:改标题必须 409,不能出现「已完成但标题被改了」', async () => {
    const t = await createTask('读和写之间');
    const repo = app.get<TasksRepository>(TASKS_REPOSITORY);
    const original = repo.findById.bind(repo) as (...args: unknown[]) => Promise<unknown>;
    let injected = false;
    vi.spyOn(repo, 'findById').mockImplementation(async (...args: unknown[]) => {
      const snapshot = await original(...args); // 改标题的请求读到的:done = false
      if (!injected && args[0] === t.id) {
        injected = true;
        await request(server()).patch(`/v2/tasks/${t.id}`).set(KEY).send({ done: true }).expect(200); // 别的请求:标成已完成
      }
      return snapshot as never; // 把已经过时的数据交回给改标题的请求
    });
    const rename = await request(server()).patch(`/v2/tasks/${t.id}`).set(KEY).send({ title: '偷偷改名' });
    const final = (await request(server()).get(`/v2/tasks/${t.id}`).expect(200)).body;
    expect({ status: rename.status, done: final.done, title: final.title }).toEqual({ status: 409, done: true, title: '读和写之间' });
    expect(rename.body.type).toBe('https://nest-lab.example/problems/conflict/task-completed');
  });

  it('悲观锁 updateLocked:10 个同时到达的「读计数 → +1 → 写」排队执行,一个都不丢', async () => {
    const t = await createTask('计数 0');
    const repo = app.get<TasksRepository>(TASKS_REPOSITORY);
    const bump = () =>
      repo.updateLocked(t.id, (current) => ({ title: `计数 ${Number(current.title.split(' ')[1]) + 1}` }));
    await Promise.all(Array.from({ length: 10 }, bump));
    expect(await repo.findById(t.id)).toMatchObject({ title: '计数 10', version: 11 });
  });

  it('悲观锁 updateLocked:decide 抛异常 = 不写,版本不变', async () => {
    const t = await createTask('不写');
    const repo = app.get<TasksRepository>(TASKS_REPOSITORY);
    await expect(
      repo.updateLocked(t.id, () => {
        throw new Error('规则不允许');
      }),
    ).rejects.toThrow('规则不允许');
    expect(await repo.findById(t.id)).toMatchObject({ title: '不写', version: 1 });
    expect(await repo.updateLocked(999_999, () => ({ title: 'x' }))).toBeUndefined();
  });

  it('③ 两个 DELETE 同时到达:一个 204,一个 404', async () => {
    const t = await createTask('删两次');
    const res = await Promise.all([
      request(server()).delete(`/v2/tasks/${t.id}`).set(ADMIN),
      request(server()).delete(`/v2/tasks/${t.id}`).set(ADMIN),
    ]);
    expect(res.map((r) => r.status).sort()).toEqual([204, 404]);
  });
});
