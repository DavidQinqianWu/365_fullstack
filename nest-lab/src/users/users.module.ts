import { Module } from '@nestjs/common';
import { CLOCK, systemClock, type Clock } from '../common/clock.js';
import { classProvider, valueProvider } from '../common/typed-token.js';
import { InMemoryUsersRepository } from './in-memory-users.repository.js';
import { hashPassword } from './password.js';
import type { User } from './user.js';
import { UsersController } from './users.controller.js';
import { USERS_REPOSITORY, USERS_SEED } from './users.repository.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [UsersController],
  exports: [UsersService], // Day 18 的序列化实验模块要借用它
  providers: [
    UsersService,
    classProvider(USERS_REPOSITORY, InMemoryUsersRepository),
    valueProvider(CLOCK, systemClock),
    {
      // 异步工厂:开店前先把样品用户的密码哈希算好(Nest 会等这个 Promise)
      provide: USERS_SEED,
      inject: [CLOCK],
      useFactory: async (clock: Clock): Promise<User[]> => [
        {
          id: 1,
          email: 'alice@example.com',
          displayName: 'Alice',
          role: 'admin',
          passwordHash: await hashPassword('alice-password'),
          internalNote: '创始成员,负责审批',
          createdAt: clock.now(),
        },
        {
          id: 2,
          email: 'bob@example.com',
          displayName: 'Bob',
          role: 'user',
          passwordHash: await hashPassword('bob-password'),
          internalNote: '曾申请注销,已挽留',
          createdAt: clock.now(),
        },
      ],
    },
  ],
})
export class UsersModule {}
