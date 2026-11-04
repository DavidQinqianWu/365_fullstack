import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsNotBlank } from '../../common/validation/is-not-blank.validator.js';
import type { UserRole } from '../user.js';

// 进口报关单(Day 16):客户端发来的是明文 password,不是 passwordHash;id、createdAt、internalNote 都不能填
export class CreateUserDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotBlank()
  @MaxLength(50)
  displayName!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsIn(['user', 'admin'])
  role?: UserRole;
}
