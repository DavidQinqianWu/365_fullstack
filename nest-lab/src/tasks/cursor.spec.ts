import { ProblemException } from '../common/problems/problem.exception.js';
import { decodeCursor, encodeCursor } from './cursor.js';
import { compareBySort, type SortKey, withTieBreaker } from './task-query.js';

describe('cursor 与排序工具', () => {
  const sort: SortKey[] = withTieBreaker([{ field: 'createdAt', dir: 'desc' }]);

  it('没有按 id 排序时,自动补 id 升序作为 tie-breaker', () => {
    expect(sort).toEqual([
      { field: 'createdAt', dir: 'desc' },
      { field: 'id', dir: 'asc' },
    ]);
  });

  it('compareBySort:第一列相同时比第二列', () => {
    expect(compareBySort(['2026-01-01', 1], ['2026-01-01', 2], sort)).toBeLessThan(0);
    expect(compareBySort(['2026-01-02', 9], ['2026-01-01', 1], sort)).toBeLessThan(0); // createdAt 倒序
  });

  it('编码再解码,拿回同一个位置', () => {
    const c = encodeCursor(sort, { done: false }, { values: ['2026-01-01', 7], id: 7 });
    expect(decodeCursor(c, sort, { done: false })).toEqual({ values: ['2026-01-01', 7], id: 7 });
  });

  it('排序或过滤条件变了,旧 cursor 被拒绝', () => {
    const c = encodeCursor(sort, { done: false }, { values: ['2026-01-01', 7], id: 7 });
    expect(() => decodeCursor(c, withTieBreaker([{ field: 'title', dir: 'asc' }]), { done: false })).toThrow(ProblemException);
    expect(() => decodeCursor(c, sort, { done: true })).toThrow(ProblemException);
  });

  it('乱码 cursor 被拒绝', () => {
    expect(() => decodeCursor('abc', sort, {})).toThrow(ProblemException);
  });
});
