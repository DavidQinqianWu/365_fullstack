import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { Task } from './task.js';
import { TasksService } from './tasks.service.js';

// Controller = 前台接待:只管「哪张单子交给谁」(路由 + 取参数 + 交回结果),不自己做菜。
// @Controller('tasks') 这张标签的意思:「这个类负责 /tasks 开头的请求」。
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

  // GET /tasks/:id —— :id 是路径参数,@Param('id') 把它取出来(取出来永远是字符串)
  @Get(':id')
  findOne(@Param('id') id: string): Task {
    console.log(`  ③ Controller 前台接单:GET /tasks/${id}`);
    // 今天手动转数字;Day 10 会换成 ParseIntPipe,让「abc」直接 400
    return this.tasksService.findOne(Number(id));
  }

  // POST /tasks —— @Body() 拿到的是已经解析好的 JSON(Day 6 里你自己拼 chunk、JSON.parse 的活)
  // 注意:今天没有任何校验,body 里没有 title 也会被收下。Week 3 用 DTO + ValidationPipe 补上。
  @Post()
  create(@Body() body: { title: string }): Task {
    console.log('  ③ Controller 前台接单:POST /tasks');
    return this.tasksService.create(body.title);
  }
}
