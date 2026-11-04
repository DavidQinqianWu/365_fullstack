import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { IsNotBlank } from '../../common/validation/is-not-blank.validator.js';
import { ChecklistItemDto } from './checklist-item.dto.js';

// PUT /tasks/:id 的报关单 = 「客户端能写的全部字段」的完整表示(Day 15:整体替换)
// 注意:这里没有 id、createdAt —— 客户端传了就是多余字段,forbidNonWhitelisted 直接拒绝(防批量赋值)
export class ReplaceTaskDto {
  // @Transform:报关员先把首尾空格去掉,再交给后面的校验(class-transformer 在 class-validator 之前跑)
  // Day 20:@ApiProperty 是给菜单册看的说明(不开 CLI 插件,理由见 Day 20 讲义);class-validator 是给海关看的规则
  @ApiProperty({ description: '标题,首尾空格会被去掉,不能全是空白', maxLength: 100, example: '学 OpenAPI' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotBlank() // 自定义校验器:'   ' 也不行
  @MaxLength(100)
  title!: string;

  @ApiProperty({ description: '是否已完成', example: false })
  @IsBoolean()
  done!: boolean;

  // 嵌套数组:@ValidateNested 让 class-validator 进去检查每一项,
  // @Type 告诉 class-transformer「每一项要变成 ChecklistItemDto 实例」—— 缺了它,里面那层根本不会被校验
  // 可选:PUT 时不给 = 按「整体替换」清空为 []
  @ApiPropertyOptional({ type: () => [ChecklistItemDto], maxItems: 20, description: 'PUT 时不给 = 清空为 []' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[];
}
