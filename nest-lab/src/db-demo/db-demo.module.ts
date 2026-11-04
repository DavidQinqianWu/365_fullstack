import { Module } from '@nestjs/common';
import { AppModule } from '../app.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { DbDemoController } from './db-demo.controller.js';

// Day 27:完整的 AppModule + 几个实验接口(SQL 注入对比、连接池观察、绕过 DTO 的写入)。
// 只给 npm run day27 用;AppModule 本身不导入它。
@Module({ imports: [AppModule, DatabaseModule], controllers: [DbDemoController] })
export class DbDemoAppModule {}
