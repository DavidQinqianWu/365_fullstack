import type { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { ProblemException } from '../problems/problem.exception.js';
import { ProblemTypes } from '../problems/problem-types.js';

// Day 16:zod 方案的最小 ValidationPipe(对照用)。
// 用法:@Body(new ZodValidationPipe(createTaskSchema)) dto: CreateTaskInput
// Day 17:和 class-validator 版一样输出 problem+json 的字段级 errors(issue.path → JSON Pointer)
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        pointer: `#${i.path.map((p) => `/${String(p)}`).join('')}`,
        detail: i.message,
      }));
      throw new ProblemException(ProblemTypes.validation, `有 ${errors.length} 处不符合要求`, { errors });
    }
    return result.data;
  }
}
