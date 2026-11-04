import { Reflector } from '@nestjs/core';

// 元数据装饰器 #2(新写法):Reflector.createDecorator<值的类型>()。
// 不需要自己起 key —— 装饰器对象本身就是 key,读的时候 reflector.get(Roles, ...) 传它就行;
// 拼错名字是编译错误,值的类型也有检查(这里必须是 string[])。
// 用法:@Roles(['admin'])
export const Roles = Reflector.createDecorator<string[]>();
