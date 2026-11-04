import type { ValidationError } from 'class-validator';
import { type ProblemFieldError, ProblemException } from './problem.exception.js';
import { ProblemTypes } from './problem-types.js';

// Day 17:ValidationPipe 的 exceptionFactory —— 把 class-validator 的错误树压平成「字段 → 错误」列表。
// class-validator 给的是一棵树(checklist → 1 → text),前端要的是「哪个输入框标红、显示什么字」。
// pointer 用 JSON Pointer(RFC 6901)写法:#/checklist/1/text,和 RFC 9457 附录里的示例一致。
export function flattenValidationErrors(errors: ValidationError[], parent = ''): ProblemFieldError[] {
  return errors.flatMap((e) => {
    const pointer = `${parent}/${escapePointer(e.property)}`;
    const own = Object.values(e.constraints ?? {}).map((detail) => ({ pointer: `#${pointer}`, detail }));
    return [...own, ...flattenValidationErrors(e.children ?? [], pointer)];
  });
}

// JSON Pointer 规定:属性名里的 ~ 写成 ~0,/ 写成 ~1
const escapePointer = (s: string) => s.replace(/~/g, '~0').replace(/\//g, '~1');

export function validationExceptionFactory(errors: ValidationError[]): ProblemException {
  const fieldErrors = flattenValidationErrors(errors);
  return new ProblemException(ProblemTypes.validation, `有 ${fieldErrors.length} 处不符合要求`, {
    errors: fieldErrors,
  });
}
