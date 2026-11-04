import { applyDecorators, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../roles.guard.js';
import { Roles } from './roles.decorator.js';

// 组合装饰器:applyDecorators 把几张标签 / 几个切面打包成一个。
// @AdminOnly() = @Roles(['admin']) + @UseGuards(RolesGuard)
// 以后要再加 @ApiBearerAuth()、@ApiForbiddenResponse() 之类的 swagger 标签(Week 3),也只改这一处。
export function AdminOnly() {
  return applyDecorators(Roles(['admin']), UseGuards(RolesGuard));
}
