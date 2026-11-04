import { registerDecorator, type ValidationArguments, type ValidationOptions } from 'class-validator';

// 自定义校验器:字符串不能全是空白。
// class-validator 自带的 @IsNotEmpty() 只拦 ''、null、undefined,'   ' 能混过去。
// 一个自定义校验器 = 一个名字 + 一个 validate 函数 + 一条默认错误信息,用 registerDecorator 注册成装饰器。
export function IsNotBlank(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isNotBlank',
      target: target.constructor,
      propertyName: String(propertyName),
      options,
      validator: {
        validate: (value: unknown) => typeof value === 'string' && value.trim().length > 0,
        defaultMessage: (args?: ValidationArguments) => `${args?.property} 不能为空或全是空白`,
      },
    });
  };
}
