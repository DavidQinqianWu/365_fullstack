import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CLOCK, type Clock } from '../common/clock.js';
import { ctxLog } from '../common/request-context/request-context.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import { hashPassword } from './password.js';
import type { User } from './user.js';
import { USERS_REPOSITORY, type UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly repo: UsersRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  findAll(): User[] {
    return this.repo.findAll();
  }

  findOne(id: number): User {
    const user = this.repo.findById(id);
    if (!user) throw new NotFoundException(`没有 id 为 ${id} 的用户`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    // 日志里只记不敏感的东西:不记 dto(里面有明文密码),也不记 passwordHash(Day 17 的教训)
    ctxLog(`   ④ Service    后厨做菜:createUser(${dto.email})`);
    return this.repo.insert({
      email: dto.email,
      displayName: dto.displayName,
      role: dto.role ?? 'user',
      passwordHash: await hashPassword(dto.password),
      internalNote: '',
      createdAt: this.clock.now(),
    });
  }
}
