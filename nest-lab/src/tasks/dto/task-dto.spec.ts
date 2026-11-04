import { ValidationPipe } from '@nestjs/common';
import { ProblemException } from '../../common/problems/problem.exception.js';
import { validationPipeOptions } from '../../common/validation/validation.options.js';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js';
import { CreateTaskDto } from './create-task.dto.js';
import { createTaskSchema } from './task.zod.js';
import { UpdateTaskDto } from './update-task.dto.js';

// 同一份报关单的两种写法,对同一批输入应该给出同样的「过 / 不过」结论
describe('CreateTaskDto(class-validator)vs createTaskSchema(zod)', () => {
  const cvPipe = new ValidationPipe(validationPipeOptions);
  const zodPipe = new ZodValidationPipe(createTaskSchema);
  const cv = (body: unknown) => cvPipe.transform(body, { type: 'body', metatype: CreateTaskDto });
  const zod = async (body: unknown) => zodPipe.transform(body);

  const good = [{ title: '学 zod' }, { title: '  有空格  ' }, { title: 'x', checklist: [{ text: 'a', done: false }] }];
  const bad = [{}, { title: '   ' }, { title: 123 }, { title: 'x', id: 1 }, { title: 'x', checklist: [{ text: 'a', done: 'no' }] }];

  it.each(good)('合法:%j —— 两边都通过,标题都去掉了首尾空格', async (body) => {
    const a = (await cv(body)) as CreateTaskDto;
    const b = await zod(body);
    expect(a.title).toBe(b.title);
    expect(a).toBeInstanceOf(CreateTaskDto); // class-validator 版拿到的是 DTO 实例
  });

  it.each(bad)('非法:%j —— 两边都是 422 的 ProblemException(validation-error)', async (body) => {
    for (const run of [cv, zod]) {
      const err = await run(body).then(
        () => null,
        (e: unknown) => e,
      );
      expect(err).toBeInstanceOf(ProblemException);
      expect((err as ProblemException).getStatus()).toBe(422);
      expect((err as ProblemException).problemType.type).toMatch(/validation-error$/);
    }
  });

  it('PartialType:UpdateTaskDto 的每个字段都可选,但给了就照样检查', async () => {
    const pipe = (body: unknown) => cvPipe.transform(body, { type: 'body', metatype: UpdateTaskDto });
    await expect(pipe({})).resolves.toEqual({});
    await expect(pipe({ done: 'yes' })).rejects.toBeInstanceOf(ProblemException);
  });
});
