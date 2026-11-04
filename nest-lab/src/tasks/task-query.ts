import type { Task } from './task.js';

// Day 19:列表查询的「内部」描述 —— 仓储只认这个,不认 HTTP 的 query 字符串。
// Week 4 换 PostgreSQL 时,它会被翻译成 WHERE / ORDER BY / LIMIT(和 keyset 的 WHERE (a, id) > (x, y))。

// 字段白名单:只有这几列能排序。用户传别的字段名 → 422(DTO 里 @IsIn 拦下)。
// 到了 SQL 里,这张白名单就是防「ORDER BY 注入」的第一道墙:排序列名不能拼接用户输入。
export const SORTABLE_FIELDS = ['id', 'createdAt', 'title'] as const;
export type SortField = (typeof SORTABLE_FIELDS)[number];

export interface SortKey {
  field: SortField;
  dir: 'asc' | 'desc';
}

export interface TaskFilter {
  done?: boolean; // WHERE done = $1
  q?: string; // WHERE title ILIKE '%' || $2 || '%'
}

// keyset 分页的「书签」:上一页最后一条的完整排序元组(最后一列一定是 id)
export interface KeysetPosition {
  values: (string | number)[];
  id: number; // 冗余存一份 id,方便人读日志
}

export interface TaskQuery {
  filter: TaskFilter;
  sort: SortKey[]; // 一定以 id 结尾(唯一的 tie-breaker),见 withTieBreaker()
  limit: number;
  after?: KeysetPosition; // cursor 分页:从书签之后开始
  offset?: number; // offset 分页:跳过前 N 条
}

// 稳定排序的关键:排序键最后必须有一个唯一的列,否则「createdAt 相同的两条」谁先谁后不确定,
// 翻页时就可能重复或漏掉。没有显式按 id 排序时,自动补一个 id 升序。
export function withTieBreaker(sort: SortKey[]): SortKey[] {
  return sort.some((s) => s.field === 'id') ? sort : [...sort, { field: 'id', dir: 'asc' }];
}

export function sortValue(task: Task, field: SortField): string | number {
  return field === 'id' ? task.id : field === 'createdAt' ? task.createdAt : task.title;
}

// 按排序键逐列比较(相当于 SQL 的 ORDER BY a DESC, b ASC, id ASC)
export function compareBySort(a: (string | number)[], b: (string | number)[], sort: SortKey[]): number {
  for (let i = 0; i < sort.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (x === y) continue;
    const order = x < y ? -1 : 1;
    return sort[i]!.dir === 'asc' ? order : -order;
  }
  return 0;
}

export function sortTuple(task: Task, sort: SortKey[]): (string | number)[] {
  return sort.map((s) => sortValue(task, s.field));
}
