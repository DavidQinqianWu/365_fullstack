import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CLOCK, type Clock } from '../common/clock.js';
import type { Task } from './task.js';
import { TASKS_REPOSITORY, type TasksRepository } from './tasks.repository.js';
import { TasksModule } from './tasks.module.js';
import { TasksService } from './tasks.service.js';

// 一个永远停在 2026-01-01 的假时钟:有了它,createdAt 可以写死断言
const fixedClock: Clock = { now: () => new Date('2026-01-01T00:00:00.000Z') };

describe('TasksService(用真实的 TasksModule,只换掉时钟)', () => {
  let service: TasksService;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {}); // 测试时不打印观察日志
    // 用和生产一模一样的编制表(TasksModule),只把 CLOCK 这一行换掉 —— 业务代码一行不改
    const moduleRef = await Test.createTestingModule({ imports: [TasksModule] })
      .overrideProvider(CLOCK)
      .useValue(fixedClock)
      .compile();
    service = moduleRef.get(TasksService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('findAll 返回两条样品任务,开业时间来自注入的时钟', async () => {
    const tasks = await service.findAll();
    expect(tasks).toHaveLength(2);
    expect(tasks[0]?.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('findOne 找不到时抛 NotFoundException', async () => {
    // Day 27:方法变成 async,异常变成了「被拒绝的 Promise」,断言要换成 rejects
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('create 分配自增 id,createdAt = 时钟的时间', async () => {
    const task = await service.create({ title: '写单元测试' });
    expect(task).toEqual({ id: 3, title: '写单元测试', done: false, checklist: [], createdAt: '2026-01-01T00:00:00.000Z', version: 1 });
    // Day 40:内存仓储交出去的是复印件 —— 内容相同(toEqual),但不再是同一个对象(以前这里是 toBe)
    expect(await service.findOne(3)).toEqual(task);
    expect(await service.findOne(3)).not.toBe(task);
  });

  it('Day 40:改了别的字段,手里的旧快照不会跟着变;每次修改 version + 1', async () => {
    const before = await service.findOne(2);
    const after = await service.update(2, { title: '改过了' });
    expect(before).toMatchObject({ title: '看懂 Module / Controller / Provider', version: 1 });
    expect(after).toMatchObject({ title: '改过了', version: 2 });
  });

  it('Day 40:请求带的 version 和当前不一致 → 409 conflict/stale-version,不写', async () => {
    await expect(service.update(2, { title: '基于旧版本', version: 7 })).rejects.toMatchObject({
      problemType: { type: 'https://nest-lab.example/problems/conflict/stale-version' },
    });
    expect(await service.findOne(2)).toMatchObject({ title: '看懂 Module / Controller / Provider', version: 1 });
  });
});

describe('TasksService(把仓储换成假的,只测业务逻辑)', () => {
  it('create 把 title + 时钟时间交给仓储,不关心仓储怎么存', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const saved: Task = { id: 42, title: '假的', done: false, checklist: [], createdAt: '2026-01-01T00:00:00.000Z', version: 1 };
    const fakeRepo: TasksRepository = {
      // Day 27:接口改成 async,假仓储也要返回 Promise
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => undefined),
      insert: vi.fn(async () => saved),
      remove: vi.fn(async () => undefined), // Day 11:接口新增了 remove,假仓储也要补上
      update: vi.fn(async () => ({ status: 'not-found' as const })), // Day 15:接口新增了 update(Day 40 起返回三种结果)
      updateLocked: vi.fn(async () => undefined), // Day 40:悲观锁版本
      findPage: vi.fn(async () => []), // Day 19:接口新增了 findPage
    };
    const moduleRef = await Test.createTestingModule({ imports: [TasksModule] })
      .overrideProvider(TASKS_REPOSITORY)
      .useValue(fakeRepo)
      .overrideProvider(CLOCK)
      .useValue(fixedClock)
      .compile();

    const result = await moduleRef.get(TasksService).create({ title: '学 DI' });

    expect(fakeRepo.insert).toHaveBeenCalledWith({
      title: '学 DI',
      done: false,
      checklist: [],
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result).toBe(saved);
    vi.restoreAllMocks();
  });
});
