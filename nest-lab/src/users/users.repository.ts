import { createToken } from '../common/typed-token.js';
import type { User } from './user.js';

// 和 Day 9 的 TASKS_REPOSITORY 同一个模式:接口 + 带类型的 token(Day 12)
export interface UsersRepository {
  findAll(): User[];
  findById(id: number): User | undefined;
  insert(data: Omit<User, 'id'>): User;
}

export const USERS_REPOSITORY = createToken<UsersRepository>('USERS_REPOSITORY');
export const USERS_SEED = createToken<User[]>('USERS_SEED');
