import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsNotBlank } from '../../common/validation/is-not-blank.validator.js';
import type { UserRole } from '../user.js';

// 进口报关单(Day 16):客户端发来的是明文 password,不是 passwordHash;id、createdAt、internalNote 都不能填
export class CreateUserDto {
  @ApiProperty({ format: 'email', description: '会被去掉首尾空格并转成小写', example: 'carol@example.com' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @ApiProperty({ maxLength: 50, example: 'Carol' })
  @IsString()
  @IsNotBlank()
  @MaxLength(50)
  displayName!: string;

  @ApiProperty({ minLength: 8, maxLength: 128, description: '明文密码,只进不出(服务器存 scrypt 哈希)', example: 'carol-secret-1' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ enum: ['user', 'admin'], default: 'user' })
  @IsOptional()
  @IsIn(['user', 'admin'])
  role?: UserRole;
}
