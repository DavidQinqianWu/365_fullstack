import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProblemException } from './problems/problem.exception.js';
import { type ProblemType, ProblemTypes, problemTypeForStatus } from './problems/problem-types.js';
import { ctxLog, requestContext } from './request-context/request-context.js';
import { REQUEST_ID_HEADER, resolveRequestId } from './request-context/request-context.middleware.js';
import { RequestContextService } from './request-context/request-context.service.js';

// 投诉处理台(全局 exception filter,APP_FILTER 注册)。
// Day 10:统一错误格式的最小版 → Day 13:带上 requestId → Day 16:透出字段错误列表
// → Day 17:升级为 RFC 9457 Problem Details(application/problem+json),所有错误都用同一张「标准投诉回执单」。
export interface ProblemDetails {
  type: string; // 错误类别的 URI(见 problem-types.ts / docs/problems.md)
  title: string; // 同一类别永远相同的简短标题
  status: number; // HTTP 状态码(和响应行一致)
  detail: string; // 这一次具体发生了什么(给人看的)
  instance: string; // 这一次出错的请求路径
  requestId: string; // 扩展字段:桌号牌(Day 13)
  [extension: string]: unknown; // 其他扩展字段,例如校验错误的 errors
}

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

@Injectable()
@Catch() // 不写参数 = 什么异常都接(包括普通 Error)
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly context: RequestContextService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    // Day 17 修复:JSON 语法错误由 body parser 抛出,它跑在发牌 middleware 之前,
    // 这时还没有桌号牌(ALS 里没有 store)。投诉台兜底:按同一规则沿用 / 生成 requestId,
    // 回写响应头,并在补发的这张牌下面完成剩下的工作(日志也带上桌号)。
    if (!this.context.requestId) {
      const requestId = resolveRequestId(req);
      if (!res.headersSent) res.setHeader(REQUEST_ID_HEADER, requestId);
      requestContext.run({ requestId, startedAt: performance.now() }, () => this.respond(exception, req, res));
      return;
    }
    this.respond(exception, req, res);
  }

  private respond(exception: unknown, req: Request, res: Response): void {
    const { problemType, detail, extensions } = describe(exception);
    const body: ProblemDetails = {
      type: problemType.type,
      title: problemType.title,
      status: problemType.status,
      detail,
      instance: req.originalUrl,
      requestId: this.context.requestId!,
      ...extensions,
    };

    if (problemType.status >= 500) {
      // 对外克制,对内详尽:真实原因只进服务端日志(带桌号),不进响应体
      ctxLog(`  ⑤-2 Filter 投诉处理台:未预期的错误 → 500:${exception instanceof Error ? (exception.stack ?? exception.message) : String(exception)}`);
    } else {
      ctxLog(`  ⑤-2 Filter 投诉处理台:${exception instanceof Error ? exception.constructor.name : typeof exception} → ${problemType.status} ${problemType.type.replace(/^.*\/problems\//, '')}`);
    }
    res.status(problemType.status).type(PROBLEM_CONTENT_TYPE).json(body);
  }
}

// 把各种异常翻译成「类别 + 这一次的说明 + 扩展字段」
function describe(exception: unknown): { problemType: ProblemType; detail: string; extensions: Record<string, unknown> } {
  if (exception instanceof ProblemException) {
    return { problemType: exception.problemType, detail: exception.detail, extensions: exception.extensions };
  }
  // 其他 HttpException 按状态码归类。JSON 语法错误也走这里:Nest 的 Express 适配器
  // 已经把 body parser 的 SyntaxError 包成了 BadRequestException(detail 就是解析器的原话,不含敏感信息)
  if (exception instanceof HttpException) {
    const problemType = problemTypeForStatus(exception.getStatus());
    return { problemType, detail: detailOf(exception), extensions: {} };
  }
  // 代码 bug:不把任何内部信息(报错原文、SQL、调用栈)给客户端
  return { problemType: ProblemTypes.internal, detail: '服务器出了点问题,请稍后重试;如果持续出现,请带上 requestId 联系我们', extensions: {} };
}

function detailOf(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'object' && response !== null && 'message' in response) {
    const m = (response as { message: unknown }).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.join(';');
  }
  return exception.message;
}
