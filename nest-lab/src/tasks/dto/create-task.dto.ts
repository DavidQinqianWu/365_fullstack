import { PickType } from '@nestjs/swagger';
import { ReplaceTaskDto } from './replace-task.dto.js';

// POST /tasks:只能给 title 和 checklist;done 由服务器决定(新任务一律未完成)
// PickType 连同装饰器一起「挑」过来,不用再写一遍规则
// Day 20:改为从 @nestjs/swagger 导入 —— 它会同时继承校验规则和文档说明;
// 用 @nestjs/mapped-types 的版本,校验照样继承,但文档里这个 schema 是空的(Day 20 讲义有实测)
export class CreateTaskDto extends PickType(ReplaceTaskDto, ['title', 'checklist'] as const) {}
