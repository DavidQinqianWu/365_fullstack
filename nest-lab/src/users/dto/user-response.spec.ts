import type { User } from '../user.js';
import { maskEmail, toUserResponse } from './user-response.js';

const user: User = {
  id: 1,
  email: 'alice@example.com',
  displayName: 'Alice',
  role: 'admin',
  passwordHash: 'scrypt$abc$def',
  internalNote: '内部备注',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('toUserResponse(显式映射,主线做法)', () => {
  it('普通视图:只有白名单字段,email 打码,日期转 ISO', () => {
    expect(toUserResponse(user, 'user')).toEqual({
      id: 1,
      email: 'a***@example.com',
      displayName: 'Alice',
      role: 'admin',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('admin 视图:多了 internalNote,仍然没有 passwordHash', () => {
    const r = toUserResponse(user, 'admin');
    expect(r.internalNote).toBe('内部备注');
    expect(r).not.toHaveProperty('passwordHash');
  });

  it('内部模型多出新字段(比如 resetToken),响应不受影响', () => {
    const withSecret = { ...user, resetToken: 'rst_xxx' };
    expect(JSON.stringify(toUserResponse(withSecret, 'admin'))).not.toContain('rst_xxx');
  });

  it('maskEmail', () => {
    expect(maskEmail('bob@example.com')).toBe('b***@example.com');
  });
});
