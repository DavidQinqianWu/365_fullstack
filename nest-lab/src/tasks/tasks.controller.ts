import { Body, Controller, Delete, Get, Param, Post, UseInterceptors } from '@nestjs/common';
import { AdminOnly } from '../common/decorators/admin-only.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { RequestId } from '../common/decorators/request-id.decorator.js';
import { TracedParseIntPipe } from '../common/traced-parse-int.pipe.js';
import { WrapResponseInterceptor } from '../common/wrap-response.interceptor.js';
import type { Task } from './task.js';
import { TasksService } from './tasks.service.js';

// Controller = 前台接待:只管「哪张单子交给谁」(路由 + 取参数 + 交回结果),不自己做菜。
// Day 10:Controller 级别的切面 —— 这个类的所有方法返回值都被包成 { data, timestamp }
// Day 11:全局保安(APP_GUARD)默认要钥匙;读接口贴 @Public() 免检,写接口不贴 = 要钥匙
@UseInterceptors(WrapResponseInterceptor)
@Controller('tasks')
export class TasksController {
  // 构造函数里只「声明我需要后厨」,不自己 new —— Nest 启动时会自动塞进来(Day 9 讲原理)。
  constructor(private readonly tasksService: TasksService) {}

  // GET /tasks
  @Public()
  @Get()
  findAll(): Task[] {
    console.log('  ③ Controller 前台接单:GET /tasks');
    return this.tasksService.findAll();
  }

  // GET /tasks/:id —— Day 10:Pipe 先把 '2' 转成 2;'abc' 直接 400
  @Public()
  @Get(':id')
  findOne(@Param('id', TracedParseIntPipe) id: number): Task {
    console.log(`  ③ Controller 前台接单:GET /tasks/${id}`);
    return this.tasksService.findOne(id);
  }

  // POST /tasks —— 没贴 @Public(),要过全局保安(请求头 x-demo-key: let-me-in)
  // Day 11:@RequestId() 参数装饰器,每个请求执行一次,把请求 ID 交到参数里
  // 注意:今天仍然没有 body 校验,Week 3 用 DTO + ValidationPipe 补上。
  @Post()
  create(@Body() body: { title: string }, @RequestId() requestId: string): Task {
    console.log(`  ③ Controller 前台接单:POST /tasks(requestId=${requestId})`);
    return this.tasksService.create(body.title);
  }

  // DELETE /tasks/:id —— Day 11:组合装饰器 @AdminOnly() = @Roles(['admin']) + @UseGuards(RolesGuard)
  // 要同时过两道保安:全局的钥匙检查 + 这里的角色检查(请求头 x-demo-role: admin)
  @AdminOnly()
  @Delete(':id')
  remove(@Param('id', TracedParseIntPipe) id: number): Task {
    console.log(`  ③ Controller 前台接单:DELETE /tasks/${id}`);
    return this.tasksService.remove(id);
  }
}
