import { PickType } from '@nestjs/mapped-types';
import { ReplaceTaskDto } from './replace-task.dto.js';

// POST /tasks:只能给 title 和 checklist;done 由服务器决定(新任务一律未完成)
// PickType 连同装饰器一起「挑」过来,不用再写一遍规则
// (Day 20 接 swagger 时,改成从 @nestjs/swagger 导入同名的 PickType / PartialType,文档才能跟着继承)
export class CreateTaskDto extends PickType(ReplaceTaskDto, ['title', 'checklist'] as const) {}
