import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { PROBLEM_BASE_URI } from './problem-types.js';

// Day 20:把 Day 17 的 problem+json 写进菜单册。
// 这两个类只用于文档;真正的错误体由 AllExceptionsFilter 组装(字段和它的 ProblemDetails 接口一一对应)。
export class ProblemDetailsDto {
  @ApiProperty({ description: '错误类别的 URI,程序判断请看它。目录见 docs/problems.md', example: `${PROBLEM_BASE_URI}not-found` })
  type!: string;

  @ApiProperty({ description: '同一类别永远相同的简短标题', example: '资源不存在' })
  title!: string;

  @ApiProperty({ description: 'HTTP 状态码,与响应行一致', example: 404 })
  status!: number;

  @ApiProperty({ description: '这一次具体发生了什么(给人看的)', example: '没有 id 为 999 的任务' })
  detail!: string;

  @ApiProperty({ description: '这一次出错的请求路径', example: '/v2/tasks/999' })
  instance!: string;

  @ApiProperty({ description: '扩展字段:请求 ID,与响应头 x-request-id 相同;报错时请附上', example: '7c1e2f0a-…' })
  requestId!: string;
}

export class FieldErrorDto {
  @ApiProperty({ description: 'JSON Pointer(RFC 6901),指向出错的字段;查询参数也用这个写法', example: '#/checklist/1/text' })
  pointer!: string;

  @ApiProperty({ example: 'text 不能为空或全是空白' })
  detail!: string;
}

export class ValidationProblemDto extends ProblemDetailsDto {
  @ApiPropertyOptional({ type: () => [FieldErrorDto], description: '字段级错误列表(type 为 validation-error 时)' })
  errors?: FieldErrorDto[];
}

export const PROBLEM_JSON = 'application/problem+json';

const DESCRIPTIONS: Record<number, string> = {
  400: '请求格式错误(JSON 语法错、路径参数不是整数、cursor 无效)',
  403: '没有权限(缺少或错误的 x-demo-key / 角色不够)',
  404: '资源不存在',
  405: '该资源不支持此方法(响应头 Allow 列出了支持的方法)',
  406: '无法提供 Accept 要求的格式',
  409: '与资源当前状态冲突(如已完成的任务改标题;请求带的 version 已过时)',
  415: '请求体不是 application/json',
  422: '请求内容未通过校验,见 errors',
};

// 一行声明一组可能的错误响应,内容类型都是 application/problem+json(Day 11 的组合装饰器套路)
export function ApiProblemResponses(...statuses: number[]) {
  return applyDecorators(
    ApiExtraModels(ProblemDetailsDto, ValidationProblemDto, FieldErrorDto),
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: DESCRIPTIONS[status] ?? '错误',
        content: {
          [PROBLEM_JSON]: {
            schema: { $ref: getSchemaPath(status === 422 ? ValidationProblemDto : ProblemDetailsDto) },
          },
        },
      }),
    ),
  );
}
