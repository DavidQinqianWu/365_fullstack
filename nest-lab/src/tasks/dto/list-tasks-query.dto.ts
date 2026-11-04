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
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  done?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  // 'createdAt,-title' → ['createdAt', '-title'],每一项都必须在白名单里
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.split(',').map((s) => s.trim()) : value))
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(SORT_TOKENS, { each: true })
  sort?: string[];

  // 查询参数永远是字符串,@Type 先把 '20' 变成 20。超过上限 → 422(不悄悄截断,理由见 Day 19 讲义)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;
}
