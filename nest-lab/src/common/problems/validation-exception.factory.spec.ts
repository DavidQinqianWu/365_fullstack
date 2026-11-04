import type { ValidationError } from 'class-validator';
import { flattenValidationErrors } from './validation-exception.factory.js';

describe('flattenValidationErrors:错误树 → JSON Pointer 列表', () => {
  it('嵌套的 checklist[1].text 变成 #/checklist/1/text', () => {
    const tree = [
      {
        property: 'checklist',
        children: [{ property: '1', children: [{ property: 'text', constraints: { isNotBlank: '不能为空' }, children: [] }] }],
      },
    ] as unknown as ValidationError[];
    expect(flattenValidationErrors(tree)).toEqual([{ pointer: '#/checklist/1/text', detail: '不能为空' }]);
  });

  it('属性名里的 / 和 ~ 按 RFC 6901 转义', () => {
    const tree = [{ property: 'a/b~c', constraints: { x: '坏了' }, children: [] }] as unknown as ValidationError[];
    expect(flattenValidationErrors(tree)).toEqual([{ pointer: '#/a~1b~0c', detail: '坏了' }]);
  });
});
