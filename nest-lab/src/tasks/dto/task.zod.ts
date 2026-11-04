import { z } from 'zod';

// Day 16:同一份报关单的 zod 写法(对照用,主线用 class-validator,理由见讲义)。
// .strict() ≈ forbidNonWhitelisted:多出来的字段直接报错
const notBlank = z.string().trim().min(1, '不能为空或全是空白').max(100);

export const checklistItemSchema = z.object({ text: notBlank, done: z.boolean() }).strict();

export const replaceTaskSchema = z
  .object({
    title: notBlank,
    done: z.boolean(),
    checklist: z.array(checklistItemSchema).max(20).optional(),
  })
  .strict();

export const createTaskSchema = replaceTaskSchema.pick({ title: true, checklist: true }).strict();
export const updateTaskSchema = replaceTaskSchema.partial().strict();

// 类型从 schema 推导出来,不用再写一遍 class
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type ReplaceTaskInput = z.infer<typeof replaceTaskSchema>;
