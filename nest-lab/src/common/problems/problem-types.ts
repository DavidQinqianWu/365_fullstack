import { HttpStatus } from '@nestjs/common';
import { STATUS_CODES } from 'node:http';

// Day 17:错误类型目录(投诉类别编号表)。完整说明见 nest-lab/docs/problems.md。
//
// type 是「错误类别」的唯一标识符(URI)。它只是一个名字,不要求真的能打开,
// 但最好能打开:调用方点进去就能看到「这类错误是什么、怎么处理」。
// nest-lab 用 example 域名(RFC 2606 保留,不会被真人注册)占位,真上线时换成你自己的文档站。
// ⚠️ type 和 title 一旦发布就是对外契约:调用方会写 if (problem.type === '...'),不要随便改。
export const PROBLEM_BASE_URI = 'https://nest-lab.example/problems/';

export interface ProblemType {
  type: string; // 完整 URI
  title: string; // 同一类错误永远不变的简短标题(不放具体细节)
  status: number; // 这类错误通常对应的 HTTP 状态码
}

const define = (slug: string, title: string, status: number): ProblemType => ({
  type: PROBLEM_BASE_URI + slug,
  title,
  status,
});

export const ProblemTypes = {
  badRequest: define('bad-request', '请求格式错误', HttpStatus.BAD_REQUEST),
  invalidCursor: define('invalid-cursor', '分页 cursor 无效', HttpStatus.BAD_REQUEST), // Day 19
  forbidden: define('forbidden', '没有权限执行此操作', HttpStatus.FORBIDDEN),
  notFound: define('not-found', '资源不存在', HttpStatus.NOT_FOUND),
  methodNotAllowed: define('method-not-allowed', '该资源不支持此 HTTP 方法', HttpStatus.METHOD_NOT_ALLOWED),
  notAcceptable: define('not-acceptable', '无法提供客户端要求的响应格式', HttpStatus.NOT_ACCEPTABLE),
  taskCompleted: define('conflict/task-completed', '已完成的任务不能修改标题', HttpStatus.CONFLICT),
  staleVersion: define('conflict/stale-version', '任务已被其他请求修改', HttpStatus.CONFLICT), // Day 40:乐观锁
  unsupportedMediaType: define('unsupported-media-type', '不支持的请求体格式', HttpStatus.UNSUPPORTED_MEDIA_TYPE),
  validation: define('validation-error', '请求内容未通过校验', HttpStatus.UNPROCESSABLE_ENTITY),
  internal: define('internal', '服务器内部错误', HttpStatus.INTERNAL_SERVER_ERROR),
} as const;

// 没有专门指定 type 的 HttpException,按状态码找一个默认类别;目录里没有的状态码用 about:blank
// (RFC 9457:about:blank 表示「除了状态码本身,没有更多语义」,此时 title 应该就是状态码的标准名称)
const BY_STATUS = new Map<number, ProblemType>(
  Object.values(ProblemTypes)
    .filter((p) => p !== ProblemTypes.invalidCursor) // 400 的默认类别仍是 bad-request
    .map((p) => [p.status, p]),
);
BY_STATUS.set(HttpStatus.CONFLICT, define('conflict', '与资源当前状态冲突', HttpStatus.CONFLICT));

export function problemTypeForStatus(status: number): ProblemType {
  // RFC 9457 §4.2.1:type 为 about:blank 时,title 应当就是状态码的标准短语(如 413 → Payload Too Large)
  return BY_STATUS.get(status) ?? { type: 'about:blank', title: STATUS_CODES[status] ?? 'Error', status };
}
