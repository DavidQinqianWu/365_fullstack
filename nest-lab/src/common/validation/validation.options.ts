import type { ValidationPipeOptions } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { validationExceptionFactory } from '../problems/validation-exception.factory.js';

// Day 16:全局 ValidationPipe 的配置(AppModule 用 APP_PIPE 注册;观察脚本、测试复用同一份)
export const validationPipeOptions: ValidationPipeOptions = {
  whitelist: true, // 只保留 DTO 里有装饰器的字段
  forbidNonWhitelisted: true, // 多出来的字段不是悄悄丢掉,而是直接报错(理由见讲义)
  transform: true, // 把普通对象变成 DTO 类的实例;路径 / 查询参数按声明的类型转换
  // 400 还是 422(Day 15 留的问题):
  //   400 = 请求本身坏了(JSON 语法错、路径参数不是整数)—— 由 body parser / ParseIntPipe 负责
  //   422 = JSON 没问题,但字段内容不符合规则 —— 由这里负责
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  // Day 17:不用默认的字符串数组,改成 problem+json 的字段级 errors(状态码由 ProblemTypes.validation 决定,仍是 422)
  exceptionFactory: validationExceptionFactory,
};
