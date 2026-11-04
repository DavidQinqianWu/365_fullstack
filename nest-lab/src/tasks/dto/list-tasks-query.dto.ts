import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { SORTABLE_FIELDS } from '../task-query.js';

// Day 19:列表接口的查询参数报关单(Day 16 的 DTO,这次管的是 ?query 而不是请求体)。
// 全局 ValidationPipe 开着 forbidNonWhitelisted,所以 ?page=2 这种没登记的参数会直接 422。
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// 允许的排序写法:字段名,前面加 - 表示倒序。例如 sort=-createdAt,title
const SORT_TOKENS = SORTABLE_FIELDS.flatMap((f) => [f, `-${f}`]);

export class ListTasksQueryDto {
  // ⚠️ 不能用 @Type(() => Boolean):Boolean('false') 是 true(Day 12 的老坑)。这里只认 'true' / 'false' 两个字面值
  @ApiPropertyOptional({ type: Boolean, description: '只看已完成 / 未完成;只接受 true 或 false' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  done?: boolean;

  @ApiPropertyOptional({ maxLength: 100, description: '标题包含这个关键字(不区分大小写)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  // 'createdAt,-title' → ['createdAt', '-title'],每一项都必须在白名单里
  @ApiPropertyOptional({
    type: String,
    description: `逗号分隔,前缀 - 表示倒序,最多 3 个;可选字段:${SORT_TOKENS.join(' ')}。默认按 id 升序,总会追加 id 作为唯一排序键`,
    example: '-createdAt,title',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.split(',').map((s) => s.trim()) : value))
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(SORT_TOKENS, { each: true })
  sort?: string[];

  // 查询参数永远是字符串,@Type 先把 '20' 变成 20。超过上限 → 422(不悄悄截断,理由见 Day 19 讲义)
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT, description: '超过上限回 422,不会悄悄截断' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number;

  @ApiPropertyOptional({ maxLength: 500, description: '上一页响应里的 nextCursor,原样传回;不要解析或拼接。坏了或排序 / 过滤条件变了回 400 invalid-cursor' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;
}
