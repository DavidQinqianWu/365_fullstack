import { BadRequestException } from '@nestjs/common';
import { parseCreate, parsePatch, parseReplace } from './task-input.js';

describe('task-input(Day 15 手写的最小检查)', () => {
  it('parseCreate:去掉首尾空格;空标题 / 非对象 → 400', () => {
    expect(parseCreate({ title: '  学 REST ' })).toEqual({ title: '学 REST' });
    expect(() => parseCreate({ title: '   ' })).toThrow(BadRequestException);
    expect(() => parseCreate('hello')).toThrow(BadRequestException);
    expect(() => parseCreate(undefined)).toThrow(BadRequestException);
  });

  it('parseReplace:PUT 必须给齐 title 和 done', () => {
    expect(parseReplace({ title: 'a', done: false })).toEqual({ title: 'a', done: false });
    expect(() => parseReplace({ title: 'a' })).toThrow(/done/);
  });

  it('parsePatch:给了哪个检查哪个;一个都不给 → 400;多余字段被忽略', () => {
    expect(parsePatch({ done: true, id: 999 })).toEqual({ done: true });
    expect(() => parsePatch({})).toThrow(/至少/);
    expect(() => parsePatch({ done: 'yes' })).toThrow(/done/);
  });
});
