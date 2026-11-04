import { Logger } from '@nestjs/common';
import pg from 'pg';
import { ProblemException } from '../common/problems/problem.exception.js';
import { ProblemTypes, problemTypeForStatus } from '../common/problems/problem-types.js';

// Day 27:把数据库的「约束违反」翻译成 problem+json(约定见 docs/er-diagram.md「SQLSTATE → HTTP 状态码」)。
// 判断依据是 SQLSTATE 错误码和约束名,不是英文错误信息;翻译出来的 detail 里也不带任何 PG 原文(表名、约束名、DETAIL)。

// 约束名 → 它对应请求体里的哪个字段(JSON Pointer,Day 17)。只登记 API 能碰到的约束
const logger = new Logger('db');

const POINTERS: Record<string, string> = {
  tasks_title_check: '#/title',
  checklist_items_text_check: '#/checklist',
  checklist_items_position_check: '#/checklist',
};
// NOT NULL 违反(23502)没有约束名,只有列名:按「表.列」找
const COLUMN_POINTERS: Record<string, string> = {
  'tasks.title': '#/title',
  'tasks.done': '#/done',
  'checklist_items.text': '#/checklist',
  'checklist_items.done': '#/checklist',
};

export function isPgError(err: unknown): err is pg.DatabaseError {
  return err instanceof pg.DatabaseError;
}

export function translatePgError(err: unknown, operation: 'write' | 'delete' = 'write'): unknown {
  if (!isPgError(err)) return err;
  const pointer = (err.constraint && POINTERS[err.constraint]) ?? COLUMN_POINTERS[`${err.table}.${err.column}`] ?? '#';
  switch (err.code) {
    case '23505': // unique_violation → 409:和资源当前状态冲突
      return new ProblemException(problemTypeForStatus(409), '与已有的数据冲突(唯一性)');
    case '23503': // foreign_key_violation:插入时 = 引用的东西不存在(422);删除时 = 还被别的数据引用(409)
      return operation === 'delete'
        ? new ProblemException(problemTypeForStatus(409), '还有其他数据引用它,不能删除')
        : new ProblemException(ProblemTypes.validation, '引用了不存在的数据', { errors: [{ pointer, detail: '引用的数据不存在' }] });
    case '23502': // not_null_violation
    case '23514': // check_violation —— 这两类本该被 DTO 先拦住;走到数据库说明 DTO 漏了一条规则
      logger.warn(`约束 ${err.constraint ?? err.column ?? '?'} 拦下了一次写入(SQLSTATE ${err.code}):DTO 校验是不是漏了?`);
      return new ProblemException(ProblemTypes.validation, '请求内容未通过数据库的校验', {
        errors: [{ pointer, detail: '不符合数据规则' }],
      });
    default:
      return err; // 其他数据库错误(连不上、语法错……)交给 filter 当 500 处理,不暴露原文
  }
}
