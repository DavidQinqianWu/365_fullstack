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

  it('findAll 返回两条样品任务,开业时间来自注入的时钟', () => {
    const tasks = service.findAll();
    expect(tasks).toHaveLength(2);
    expect(tasks[0]?.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('findOne 找不到时抛 NotFoundException', () => {
    expect(() => service.findOne(999)).toThrow(NotFoundException);
  });

  it('create 分配自增 id,createdAt = 时钟的时间', () => {
    const task = service.create({ title: '写单元测试' });
    expect(task).toEqual({ id: 3, title: '写单元测试', done: false, checklist: [], createdAt: '2026-01-01T00:00:00.000Z' });
    expect(service.findOne(3)).toBe(task);
  });
});

describe('TasksService(把仓储换成假的,只测业务逻辑)', () => {
  it('create 把 title + 时钟时间交给仓储,不关心仓储怎么存', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const saved: Task = { id: 42, title: '假的', done: false, checklist: [], createdAt: '2026-01-01T00:00:00.000Z' };
    const fakeRepo: TasksRepository = {
      findAll: vi.fn(() => []),
      findById: vi.fn(() => undefined),
      insert: vi.fn(() => saved),
      remove: vi.fn(() => undefined), // Day 11:接口新增了 remove,假仓储也要补上
      update: vi.fn(() => undefined), // Day 15:接口新增了 update
      findPage: vi.fn(() => []), // Day 19:接口新增了 findPage
    };
    const moduleRef = await Test.createTestingModule({ imports: [TasksModule] })
      .overrideProvider(TASKS_REPOSITORY)
      .useValue(fakeRepo)
      .overrideProvider(CLOCK)
      .useValue(fixedClock)
      .compile();

    const result = moduleRef.get(TasksService).create({ title: '学 DI' });

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
