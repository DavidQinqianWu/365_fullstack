// 时钟:把「现在几点」也当成一个依赖注入进来,而不是在业务代码里直接 new Date()。
// 好处:测试时换成一个永远停在固定时间的假时钟,createdAt 就能写死断言。

export interface Clock {
  now(): Date;
}

// 接口在编译后会被擦掉,运行时不存在,所以不能拿 Clock 当 token。
// 用一个 Symbol 当「工牌号」:全局唯一,不会和别人起的同名字符串撞车。
export const CLOCK = Symbol('CLOCK');

// 真实时钟:在 TasksModule 里用 useValue 注册
export const systemClock: Clock = { now: () => new Date() };
