import {
  All,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  MethodNotAllowedException,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminOnly } from '../common/decorators/admin-only.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { ProblemException } from '../common/problems/problem.exception.js';
import { ProblemTypes } from '../common/problems/problem-types.js';
import { RequestId } from '../common/decorators/request-id.decorator.js';
import { ctxLog } from '../common/request-context/request-context.js';
import { TracedParseIntPipe } from '../common/traced-parse-int.pipe.js';
// ⚠️ DTO 必须用普通 import,不能用 import type:
// ValidationPipe 靠 design:paramtypes 知道参数是哪个类,import type 会让它变成 Object,校验被整个跳过
import { CreateTaskDto } from './dto/create-task.dto.js';
import { ReplaceTaskDto } from './dto/replace-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { toTaskResponse, type TaskResponse } from './dto/task-response.js';
import { TasksService } from './tasks.service.js';

// Day 15:每个 URI 支持哪些方法(405 时放进 Allow 头,OPTIONS 时也回这个)
const COLLECTION_ALLOW = 'GET, HEAD, POST, OPTIONS';
const ITEM_ALLOW = 'GET, HEAD, PUT, PATCH, DELETE, OPTIONS';

// Controller = 前台接待:只管「哪张单子交给谁」(路由 + 取参数 + 交回结果),不自己做菜。
// Day 10:曾在这里挂 WrapResponseInterceptor,把返回值包成 { data, timestamp }
// Day 18:去掉包装 —— 资源本身就是响应体(理由见 Day 18 讲义),每个方法返回 toTaskResponse() 映射后的出口报关单
// Day 11:全局保安(APP_GUARD)默认要钥匙;读接口贴 @Public() 免检,写接口不贴 = 要钥匙
// Day 15:按 REST 规范整理 —— 资源是 /tasks(集合)和 /tasks/:id(单个),动作用 HTTP 方法表达
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // GET /tasks —— 安全、幂等
  @Public()
  @Get()
  findAll(): TaskResponse[] {
    ctxLog('  ③ Controller 前台接单:GET /tasks');
    return this.tasksService.findAll().map(toTaskResponse);
  }

  // GET /tasks/:id —— 安全、幂等
  @Public()
  @Get(':id')
  findOne(@Param('id', TracedParseIntPipe) id: number): TaskResponse {
    ctxLog(`  ③ Controller 前台接单:GET /tasks/${id}`);
    return toTaskResponse(this.tasksService.findOne(id));
  }

  // POST /tasks —— 不安全、不幂等:发两次就建两条。成功 = 201 + Location 告诉客户端新资源在哪
  // Day 16:参数类型写成 DTO 类,全局 ValidationPipe(APP_PIPE)按类上的装饰器检查,不合格 422
  @Post()
  create(
    @Body() dto: CreateTaskDto,
    @RequestId() requestId: string,
    @Res({ passthrough: true }) res: Response, // passthrough:我只设个响应头,响应体照样交给 Nest
  ): TaskResponse {
    ctxLog(`  ③ Controller 前台接单:POST /tasks(requestId=${requestId})`);
    const task = this.tasksService.create(dto);
    res.setHeader('Location', `/tasks/${task.id}`);
    return toTaskResponse(task);
  }

  // PUT /tasks/:id —— 整体替换,幂等:同一个请求发 N 次,结果和发 1 次一样
  @Put(':id')
  replace(@Param('id', TracedParseIntPipe) id: number, @Body() dto: ReplaceTaskDto): TaskResponse {
    ctxLog(`  ③ Controller 前台接单:PUT /tasks/${id}`);
    return toTaskResponse(this.tasksService.replace(id, dto));
  }

  // PATCH /tasks/:id —— 部分更新:只改给了的字段
  @Patch(':id')
  update(@Param('id', TracedParseIntPipe) id: number, @Body() dto: UpdateTaskDto): TaskResponse {
    ctxLog(`  ③ Controller 前台接单:PATCH /tasks/${id}`);
    // PartialType 让每个字段都可选,所以 {} 能通过 DTO 校验;「至少改一个字段」这条规则自己补
    if (Object.keys(dto).length === 0) {
      throw new ProblemException(ProblemTypes.validation, '至少要给 title、done、checklist 中的一个', { errors: [] });
    }
    return toTaskResponse(this.tasksService.update(id, dto));
  }

  // DELETE /tasks/:id —— 幂等;成功 204 No Content(没有响应体)
  // Day 11:组合装饰器 @AdminOnly() = @Roles(['admin']) + @UseGuards(RolesGuard)
  @AdminOnly()
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', TracedParseIntPipe) id: number): void {
    ctxLog(`  ③ Controller 前台接单:DELETE /tasks/${id}`);
    this.tasksService.remove(id);
  }

  // ---------- Day 15:405 + Allow ----------
  // Express / Nest 对「路径存在、但方法不支持」默认回 404 Cannot PATCH /tasks。
  // 这里用「兜底路由」补成 405:它们必须写在最后(Day 8:路由按声明顺序匹配),
  // 前面的具体方法都没匹配上,才轮到它们。贴 @Public():告诉别人「这条路不支持这个方法」不需要钥匙。
  @Public()
  @HttpCode(204)
  @All()
  collectionFallback(@Req() req: Request, @Res({ passthrough: true }) res: Response): void {
    this.methodNotAllowed(req, res, COLLECTION_ALLOW);
  }

  @Public()
  @HttpCode(204)
  @All(':id')
  itemFallback(@Req() req: Request, @Res({ passthrough: true }) res: Response): void {
    this.methodNotAllowed(req, res, ITEM_ALLOW);
  }

  private methodNotAllowed(req: Request, res: Response, allow: string): void {
    res.setHeader('Allow', allow);
    if (req.method === 'OPTIONS') return; // OPTIONS:204 + Allow,告诉客户端这里支持哪些方法
    throw new MethodNotAllowedException(`${req.path} 不支持 ${req.method},支持:${allow}`);
  }
}
