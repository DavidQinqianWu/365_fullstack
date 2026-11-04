import { Body, Controller, Get, Headers, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { DEMO_ROLE_HEADER } from '../common/roles.guard.js';
import { TracedParseIntPipe } from '../common/traced-parse-int.pipe.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { toUserResponse, type UserResponse, type Viewer } from './dto/user-response.js';
import { UsersService } from './users.service.js';

// Day 18:Controller 只返回「出口报关单」(UserResponse),从不直接 return User。
// 读接口公开;但只有 x-demo-role: admin 才看得到完整 email 和 internalNote。
// ⚠️ x-demo-role 谁都能伪造,这里只是演示「同一资源不同视图」;Week 10 换成 JWT 里的角色。
const viewerOf = (role: string | undefined): Viewer => (role === 'admin' ? 'admin' : 'user');

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Public()
  @Get()
  findAll(@Headers(DEMO_ROLE_HEADER) role?: string): UserResponse[] {
    return this.users.findAll().map((u) => toUserResponse(u, viewerOf(role)));
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', TracedParseIntPipe) id: number, @Headers(DEMO_ROLE_HEADER) role?: string): UserResponse {
    return toUserResponse(this.users.findOne(id), viewerOf(role));
  }

  // 写接口没贴 @Public():要过全局保安(x-demo-key)
  @Post()
  async create(
    @Body() dto: CreateUserDto,
    @Headers(DEMO_ROLE_HEADER) role: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponse> {
    const user = await this.users.create(dto);
    res.setHeader('Location', `/users/${user.id}`);
    return toUserResponse(user, viewerOf(role));
  }
}
