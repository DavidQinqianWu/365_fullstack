import { IsBoolean, IsString, MaxLength } from 'class-validator';
import { IsNotBlank } from '../../common/validation/is-not-blank.validator.js';

// 报关单上的一个「子表格」:清单里的每一项
export class ChecklistItemDto {
  @IsString()
  @IsNotBlank()
  @MaxLength(100)
  text!: string;

  @IsBoolean()
  done!: boolean;
}
