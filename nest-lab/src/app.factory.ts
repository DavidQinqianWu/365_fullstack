import type { INestApplication, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestApplicationOptions } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

// Day 19:创建 app 的唯一入口(main.ts 和所有观察脚本都用它),保证 configureApp 不会被漏掉
export async function createApp(rootModule: Type<unknown> = AppModule, options?: NestApplicationOptions): Promise<INestApplication> {
  const app = await NestFactory.create(rootModule, options);
  return configureApp(app);
}
