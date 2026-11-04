import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, MaxLength } from 'class-validator';
import { IsNotBlank } from '../../common/validation/is-not-blank.validator.js';

// 报关单上的一个「子表格」:清单里的每一项
export class ChecklistItemDto {
  @ApiProperty({ maxLength: 100, example: '买菜' })
  @IsString()
  @IsNotBlank()
  @MaxLength(100)
  text!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  done!: boolean;
}
