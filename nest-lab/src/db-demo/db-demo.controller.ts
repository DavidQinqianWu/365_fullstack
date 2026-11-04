import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type pg from 'pg';
import { Public } from '../common/decorators/public.decorator.js';
import { PG_POOL } from '../database/pg-pool.js';
import type { CreateTaskDto } from '../tasks/dto/create-task.dto.js';
import { TasksService } from '../tasks/tasks.service.js';

// Day 27 的实验接口:只挂在 DbDemoAppModule 上(npm run day27 用),不在 AppModule 里,线上不存在。
// ⚠️ 这里故意写了一个有 SQL 注入漏洞的接口,只为了演示 —— 永远不要照抄。
@Public()
@Controller('demo')
export class DbDemoController {
  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    private readonly moduleRef: ModuleRef,
  ) {}

  // ❌ 拼接字符串:用户输入直接成了 SQL 的一部分。
  // 没有传参数时,pg 驱动走「简单查询协议」:整段文本原样发给数据库,里面有几条语句就执行几条
  @Get('notes/unsafe')
  async unsafe(@Query('q') q = ''): Promise<unknown> {
    const sql = `SELECT id, body FROM day27_demo.notes WHERE owner = 'alice' AND body LIKE '%${q}%'`;
    const result = (await this.pool.query(sql)) as pg.QueryResult | pg.QueryResult[];
    // 多条语句时,驱动返回的是「每条语句一个结果」的数组
    const results = Array.isArray(result) ? result : [result];
    return { sql, statements: results.map((r) => ({ command: r.command, rows: r.rows })) };
  }

  // ✅ 参数化:SQL 文本是固定的,用户输入作为「值」走另一个通道($1),永远不会被当成 SQL 解析
  @Get('notes/safe')
  async safe(@Query('q') q = ''): Promise<unknown> {
    const sql = `SELECT id, body FROM day27_demo.notes WHERE owner = 'alice' AND body LIKE '%' || $1 || '%'`;
    const { rows } = await this.pool.query(sql, [q]);
    return { sql, params: [q], rows };
  }

  // 占住一个连接 ms 毫秒,用来观察连接池
  @Get('slow')
  async slow(@Query('ms') ms = '200'): Promise<{ pid: number }> {
    const { rows } = await this.pool.query<{ pid: number }>('SELECT pg_backend_pid() AS pid, pg_sleep($1)', [Number(ms) / 1000]);
    return { pid: rows[0]!.pid };
  }

  // 绕过 DTO 校验直接交给 Service(参数类型是普通对象,ValidationPipe 不检查)——
  // 模拟「别的服务 / 脚本 / 有 bug 的代码绕过了前台」,看数据库约束怎么兜底
  @Post('raw-tasks')
  async rawCreate(@Body() body: Record<string, unknown>): Promise<unknown> {
    const tasks = this.moduleRef.get(TasksService, { strict: false });
    return tasks.create(body as unknown as CreateTaskDto);
  }
}
