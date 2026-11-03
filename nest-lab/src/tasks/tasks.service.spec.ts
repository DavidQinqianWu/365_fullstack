import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service.js';

// 单元测试:后厨可以脱离 HTTP 单独测 —— 这正是把「前台」和「后厨」分开的好处之一。
describe('TasksService', () => {
  let service: TasksService;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {}); // 测试时不打印观察日志
    service = new TasksService(); // 今天它没有依赖,直接 new 就行
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('findAll 返回两条初始任务', () => {
    expect(service.findAll()).toHaveLength(2);
  });

  it('findOne 找不到时抛 NotFoundException', () => {
    expect(() => service.findOne(999)).toThrow(NotFoundException);
  });

  it('create 分配自增 id,默认未完成', () => {
    const task = service.create('写单元测试');
    expect(task).toEqual({ id: 3, title: '写单元测试', done: false });
    expect(service.findOne(3)).toBe(task);
  });
});
