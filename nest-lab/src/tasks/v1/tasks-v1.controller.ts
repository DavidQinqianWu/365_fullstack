import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { CLOCK, type Clock } from '../../common/clock.js';
import { ApiProblemResponses } from '../../common/problems/problem.schema.js';
import { DeprecatedApi } from '../../common/decorators/deprecated-api.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { TracedParseIntPipe } from '../../common/traced-parse-int.pipe.js';
import { TaskResponse, toTaskResponse } from '../dto/task-response.js';
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

// Day 20:v1 的两种响应在文档里的 schema
class TaskV1Envelope {
  @ApiProperty({ type: () => TaskResponse }) data!: TaskResponse;
  @ApiProperty({ format: 'date-time' }) timestamp!: string;
}
class TaskListV1Envelope {
  @ApiProperty({ type: () => [TaskResponse] }) data!: TaskResponse[];
  @ApiProperty({ format: 'date-time' }) timestamp!: string;
}

// 弃用三件套也写进文档:deprecated: true(文档 UI 会划线),响应头说明
const V1_HEADERS = {
  Deprecation: { description: 'RFC 9745:弃用时间', schema: { type: 'string', example: '@1793750400' } },
  Sunset: { description: 'RFC 8594:计划下线时间', schema: { type: 'string', example: 'Sat, 01 May 2027 00:00:00 GMT' } },
  Link: { description: 'rel="deprecation" 迁移说明 / rel="successor-version" 新版本', schema: { type: 'string' } },
};

@ApiTags('tasks-v1 (deprecated)')
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

  @ApiOperation({ summary: '【已弃用】列出全部任务(不分页)', deprecated: true })
  @ApiOkResponse({ type: TaskListV1Envelope, headers: V1_HEADERS })
  @DeprecatedApi(V1_DEPRECATION)
  @Get()
  async findAll(): Promise<V1Envelope<TaskResponse[]>> {
    return this.wrap((await this.tasksService.findAll()).map(toTaskResponse));
  }

  @ApiOperation({ summary: '【已弃用】查看一个任务', deprecated: true })
  @ApiOkResponse({ type: TaskV1Envelope, headers: V1_HEADERS })
  @ApiProblemResponses(400, 404)
  @DeprecatedApi(V1_DEPRECATION)
  @Get(':id')
  async findOne(@Param('id', TracedParseIntPipe) id: number): Promise<V1Envelope<TaskResponse>> {
    return this.wrap(toTaskResponse(await this.tasksService.findOne(id)));
  }
}
