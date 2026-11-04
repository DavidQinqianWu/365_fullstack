import { BadRequestException } from '@nestjs/common';

// Day 15:手写的最小输入检查 —— 只保证「不会因为 body 长得奇怪而 500」。
// 用的是 Day 12 的套路:body 先当 unknown,检查过才收窄成有类型的值。
// Day 16 会换成 DTO + class-validator + ValidationPipe,这个文件届时删除。

export interface ReplaceTaskInput {
  title: string;
  done: boolean;
}
export type PatchTaskInput = Partial<ReplaceTaskInput>;

function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('请求体必须是一个 JSON 对象');
  }
  return body as Record<string, unknown>;
}

function checkTitle(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException('title 必须是非空字符串');
  }
  return value.trim();
}

function checkDone(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new BadRequestException('done 必须是 true 或 false');
  return value;
}

// POST:只需要 title(done 由服务器决定:新任务一律未完成)
export function parseCreate(body: unknown): { title: string } {
  return { title: checkTitle(asObject(body).title) };
}

// PUT = 整体替换:客户端能改的字段一个都不能少,少了就是 400
export function parseReplace(body: unknown): ReplaceTaskInput {
  const obj = asObject(body);
  return { title: checkTitle(obj.title), done: checkDone(obj.done) };
}

// PATCH = 部分更新:给了哪个改哪个,一个都没给是 400
export function parsePatch(body: unknown): PatchTaskInput {
  const obj = asObject(body);
  const patch: PatchTaskInput = {};
  if ('title' in obj) patch.title = checkTitle(obj.title);
  if ('done' in obj) patch.done = checkDone(obj.done);
  if (Object.keys(patch).length === 0) throw new BadRequestException('至少要给 title 或 done 中的一个');
  return patch;
}
