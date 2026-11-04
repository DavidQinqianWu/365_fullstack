import { ProblemException } from '../common/problems/problem.exception.js';
import { ProblemTypes } from '../common/problems/problem-types.js';
import type { KeysetPosition, SortKey, TaskFilter } from './task-query.js';

// Day 19:不透明的 cursor(位置书签)。
// 内容 = 这一页最后一条的排序键 + id,再加上「当时用的排序和过滤条件」;编码成 base64url。
// 「不透明」是对调用方的约定:不要解析、不要拼接,原样传回来就行 —— 服务器可以随时换内部格式。
// ⚠️ base64 不是加密,任何人都能解开看;这里面不能放任何敏感信息。

interface CursorPayload {
  v: 1; // 书签格式版本
  s: string; // 排序签名,例如 "-createdAt,id"
  f: TaskFilter; // 过滤条件
  k: (string | number)[]; // 排序键的值
  id: number;
}

export const sortSignature = (sort: SortKey[]) => sort.map((s) => (s.dir === 'desc' ? '-' : '') + s.field).join(',');

export function encodeCursor(sort: SortKey[], filter: TaskFilter, position: KeysetPosition): string {
  const payload: CursorPayload = { v: 1, s: sortSignature(sort), f: filter, k: position.values, id: position.id };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(cursor: string, sort: SortKey[], filter: TaskFilter): KeysetPosition {
  let payload: CursorPayload;
  try {
    payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as CursorPayload;
  } catch {
    throw new ProblemException(ProblemTypes.invalidCursor, 'cursor 无法解析,请使用上一页响应里的 nextCursor 原样传回');
  }
  if (payload?.v !== 1 || !Array.isArray(payload.k) || typeof payload.id !== 'number') {
    throw new ProblemException(ProblemTypes.invalidCursor, 'cursor 格式不正确');
  }
  // 书签只对「同一种排序 + 同一组过滤条件」有效:换了条件还拿旧书签,位置就没有意义了
  if (payload.s !== sortSignature(sort) || JSON.stringify(payload.f) !== JSON.stringify(filter)) {
    throw new ProblemException(ProblemTypes.invalidCursor, 'cursor 与当前的 sort / 过滤条件不匹配,请从第一页重新开始');
  }
  return { values: payload.k, id: payload.id };
}
