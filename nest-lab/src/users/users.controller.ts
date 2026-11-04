import { Body, Controller, Get, Headers, Param, Post, Res } from '@nestjs/common';
import { ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiProblemResponses } from '../common/problems/problem.schema.js';
import { Public } from '../common/decorators/public.decorator.js';
import { DEMO_ROLE_HEADER } from '../common/roles.guard.js';
import { TracedParseIntPipe } from '../common/traced-parse-int.pipe.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { toUserResponse, UserResponse, type Viewer } from './dto/user-response.js';
import { UsersService } from './users.service.js';

// Day 18:Controller 只返回「出口报关单」(UserResponse),从不直接 return User。
// 读接口公开;但只有 x-demo-role: admin 才看得到完整 email 和 internalNote。
// ⚠️ x-demo-role 谁都能伪造,这里只是演示「同一资源不同视图」;Week 10 换成 JWT 里的角色。
const viewerOf = (role: string | undefined): Viewer => (role === 'admin' ? 'admin' : 'user');

@ApiTags('users')
@ApiHeader({ name: 'x-demo-role', required: false, description: 'admin 时返回管理员视图(完整 email + internalNote);演示用,可伪造' })
@ApiProblemResponses(406)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @ApiOperation({ summary: '列出用户' })
  @ApiOkResponse({ type: [UserResponse] })
  @Public()
  @Get()
  findAll(@Headers(DEMO_ROLE_HEADER) role?: string): UserResponse[] {
    return this.users.findAll().map((u) => toUserResponse(u, viewerOf(role)));
  }

  @ApiOperation({ summary: '查看一个用户' })
  @ApiOkResponse({ type: UserResponse })
  @ApiProblemResponses(400, 404)
  @Public()
  @Get(':id')
  findOne(@Param('id', TracedParseIntPipe) id: number, @Headers(DEMO_ROLE_HEADER) role?: string): UserResponse {
    return toUserResponse(this.users.findOne(id), viewerOf(role));
  }

  // 写接口没贴 @Public():要过全局保安(x-demo-key)
  @ApiOperation({ summary: '新建用户', description: '请求里是明文 password;响应里永远没有 password / passwordHash。' })
  @ApiSecurity('demo-key')
  @ApiCreatedResponse({ type: UserResponse })
  @ApiProblemResponses(400, 403, 415, 422)
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
