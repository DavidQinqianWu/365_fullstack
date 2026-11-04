import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { DemoKeyGuard } from '../common/demo-key.guard.js';
import { TracedParseIntPipe } from '../common/traced-parse-int.pipe.js';
import { WrapResponseInterceptor } from '../common/wrap-response.interceptor.js';
import type { Task } from './task.js';
import { TasksService } from './tasks.service.js';

// Controller = 前台接待:只管「哪张单子交给谁」(路由 + 取参数 + 交回结果),不自己做菜。
// @Controller('tasks') 这张标签的意思:「这个类负责 /tasks 开头的请求」。
// Day 10:Controller 级别的切面 —— 这个类的所有方法返回值都被包成 { data, timestamp }
@UseInterceptors(WrapResponseInterceptor)
@Controller('tasks')
export class TasksController {
  // 构造函数里只「声明我需要后厨」,不自己 new —— Nest 启动时会自动塞进来(Day 9 讲原理)。
  constructor(private readonly tasksService: TasksService) {}

  // GET /tasks
  @Get()
  findAll(): Task[] {
    console.log('  ③ Controller 前台接单:GET /tasks');
    return this.tasksService.findAll(); // 直接 return 对象,Nest 帮你 JSON.stringify + 设 Content-Type
  }

  // GET /tasks/:id —— :id 是路径参数,取出来永远是字符串
  // Day 10:参数级别的切面 —— Pipe 先把 '2' 转成 2;'abc' 直接 400,根本到不了这里
  @Get(':id')
  findOne(@Param('id', TracedParseIntPipe) id: number): Task {
    console.log(`  ③ Controller 前台接单:GET /tasks/${id}`);
    return this.tasksService.findOne(id);
  }

  // POST /tasks —— @Body() 拿到的是已经解析好的 JSON(Day 6 里你自己拼 chunk、JSON.parse 的活)
  // 注意:今天没有任何校验,body 里没有 title 也会被收下。Week 3 用 DTO + ValidationPipe 补上。
  // Day 10:方法级别的切面 —— 只有新建任务要过保安(请求头 x-demo-key: let-me-in)
  @UseGuards(DemoKeyGuard)
  @Post()
  create(@Body() body: { title: string }): Task {
    console.log('  ③ Controller 前台接单:POST /tasks');
    return this.tasksService.create(body.title);
  }
}
