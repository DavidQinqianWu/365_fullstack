import { Inject, Injectable } from '@nestjs/common';
import type { User } from './user.js';
import { USERS_SEED, type UsersRepository } from './users.repository.js';

@Injectable()
export class InMemoryUsersRepository implements UsersRepository {
  private readonly rows: User[];
  private nextId: number;

  constructor(@Inject(USERS_SEED) seed: User[]) {
    this.rows = [...seed];
    this.nextId = seed.length + 1;
  }

  findAll(): User[] {
    return this.rows;
  }

  findById(id: number): User | undefined {
    return this.rows.find((u) => u.id === id);
  }

  insert(data: Omit<User, 'id'>): User {
    const user: User = { id: this.nextId++, ...data };
    this.rows.push(user);
    return user;
  }
}
