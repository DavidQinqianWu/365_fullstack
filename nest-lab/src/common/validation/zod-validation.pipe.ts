import { type PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import type { ZodType } from 'zod';

// Day 16:zod 方案的最小 ValidationPipe(对照用)。
// 用法:@Body(new ZodValidationPipe(createTaskSchema)) dto: CreateTaskInput
// 和 class-validator 版一样:不合格 → 422,错误信息是「字段: 原因」的列表。
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new UnprocessableEntityException(
        result.error.issues.map((i) => `${i.path.join('.') || '(body)'}: ${i.message}`),
      );
    }
    return result.data;
  }
}
