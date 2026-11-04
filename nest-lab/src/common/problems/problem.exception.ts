import { HttpException } from '@nestjs/common';
import type { ProblemType } from './problem-types.js';

// 一个「知道自己属于哪个错误类别」的异常。
// 业务代码:throw new ProblemException(ProblemTypes.taskCompleted, '任务 1 已完成……')
// 投诉台(AllExceptionsFilter)看到它,就直接用里面的 type / title,不再按状态码猜。
export interface ProblemFieldError {
  pointer: string; // JSON Pointer,指向请求体里出错的位置,例如 #/checklist/1/text
  detail: string;
}

export class ProblemException extends HttpException {
  constructor(
    readonly problemType: ProblemType,
    readonly detail: string,
    readonly extensions: Record<string, unknown> = {},
  ) {
    super(detail, problemType.status);
  }
}
