import { PartialType } from '@nestjs/mapped-types';
import { ReplaceTaskDto } from './replace-task.dto.js';

// PATCH /tasks/:id:和 PUT 同一套规则,但每个字段都变成可选(Day 15:部分更新)
export class UpdateTaskDto extends PartialType(ReplaceTaskDto) {}
