import { Controller, Get, Inject, Param } from '@nestjs/common';
import { CLOCK, type Clock } from '../../common/clock.js';
import { DeprecatedApi } from '../../common/decorators/deprecated-api.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { TracedParseIntPipe } from '../../common/traced-parse-int.pipe.js';
import { type TaskResponse, toTaskResponse } from '../dto/task-response.js';
import { TasksService } from '../tasks.service.js';

// Day 19:v1 = Day 10–17 的旧格式 —— 成功响应包一层 { data, timestamp },列表不分页、一次返回全部。
// 同一个 TasksService,只是换了一个「出口映射」(Day 18 的思路)。
// 为了篇幅,v1 只保留读接口;写接口只在 v2。
// 下线流程:贴上 Deprecation / Sunset → 文档与邮件通知 → 观察 v1 的调用量(日志 / 监控按版本统计)
//         → 到 Sunset 日期后先返回 410 Gone 一段时间 → 删除这个文件。
const V1_DEPRECATION = {
  deprecatedAt: new Date('2026-11-04T00:00:00Z'),
  sunsetAt: new Date('2027-05-01T00:00:00Z'),
  docs: 'https://nest-lab.example/docs/migrations/tasks-v2',
  successor: '/v2/tasks',
};

interface V1Envelope<T> {
  data: T;
  timestamp: string;
}

@Public()
@Controller({ path: 'tasks', version: '1' })
export class TasksV1Controller {
  constructor(
    private readonly tasksService: TasksService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private wrap<T>(data: T): V1Envelope<T> {
    return { data, timestamp: this.clock.now().toISOString() };
  }

  @DeprecatedApi(V1_DEPRECATION)
  @Get()
  findAll(): V1Envelope<TaskResponse[]> {
    return this.wrap(this.tasksService.findAll().map(toTaskResponse));
  }

  @DeprecatedApi(V1_DEPRECATION)
  @Get(':id')
  findOne(@Param('id', TracedParseIntPipe) id: number): V1Envelope<TaskResponse> {
    return this.wrap(toTaskResponse(this.tasksService.findOne(id)));
  }
}
