import type { Type } from '@nestjs/common';

// 带类型的 injection token:运行时还是一个普通 Symbol,编译期多带一个「它对应什么类型」的标记。
// Day 9 的 CLOCK = Symbol('CLOCK') 本身不知道自己该配一个 Clock,
// 于是 { provide: CLOCK, useValue: 随便什么 } 都能编译通过。
declare const tokenType: unique symbol;
export type TypedToken<T> = symbol & { readonly [tokenType]?: T };

export function createToken<T>(description: string): TypedToken<T> {
  return Symbol(description) as TypedToken<T>;
}

// 登记时检查:value / class 必须符合 token 声明的类型,否则编译报错
export function valueProvider<T>(provide: TypedToken<T>, useValue: T) {
  return { provide, useValue };
}

export function classProvider<T>(provide: TypedToken<T>, useClass: Type<T>) {
  return { provide, useClass };
}
