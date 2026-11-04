// 迷你 IoC 容器(约 50 行):注册 → 按 token 解析 → 递归解析依赖 → 单例缓存 → 循环依赖报错
//
// 为什么依赖要「显式声明」(static inject / inject 数组),而不是像 Nest 那样从构造函数类型里读?
//   Nest 靠 tsc 的 emitDecoratorMetadata 把构造函数参数类型写成 design:paramtypes 元数据。
//   这个目录用 tsx(esbuild)直接跑 TS,esbuild 不生成这份元数据;而且接口类型在运行时根本不存在。
//   所以这里把「我需要谁」写成一个运行时看得见的数组 —— Nest 的 @Inject(TOKEN) 和 useFactory 的 inject 也是这个思路。

export type Token = string | symbol | Constructor;
export interface Constructor<T = unknown> {
  new (...args: any[]): T;
  inject?: Token[]; // 这个类的构造函数依次需要哪些 token
}
export type Provider =
  | { provide: Token; useClass: Constructor }
  | { provide: Token; useValue: unknown }
  | { provide: Token; useFactory: (...deps: any[]) => unknown; inject?: Token[] };

export const nameOf = (t: Token): string =>
  typeof t === "function" ? t.name : typeof t === "symbol" ? (t.description ?? "Symbol()") : `'${t}'`;

export class Container {
  private readonly providers = new Map<Token, Provider>(); // 登记簿:token → 怎么造
  private readonly instances = new Map<Token, unknown>(); // 单例缓存:token → 已造好的实例

  register(...providers: (Provider | Constructor)[]): this {
    for (const p of providers) {
      // 简写:直接传一个类,等于 { provide: 类, useClass: 类 }(和 Nest 的 providers: [TasksService] 一样)
      const full: Provider = typeof p === "function" ? { provide: p, useClass: p } : p;
      this.providers.set(full.provide, full);
    }
    return this;
  }

  resolve<T>(token: Token, path: Token[] = []): T {
    if (this.instances.has(token)) return this.instances.get(token) as T; // 造过了:直接给同一个
    if (path.includes(token)) {
      throw new Error(`循环依赖:${[...path, token].map(nameOf).join(" → ")}`);
    }
    const p = this.providers.get(token);
    if (!p) {
      const who = path.length ? `(被 ${nameOf(path[path.length - 1]!)} 需要)` : "";
      throw new Error(`没有注册 ${nameOf(token)}${who}`);
    }
    const next = [...path, token];
    const deps = (list: Token[] = []) => list.map((d) => this.resolve(d, next)); // 递归:先把依赖造好

    let instance: unknown;
    if ("useValue" in p) instance = p.useValue;
    else if ("useFactory" in p) instance = p.useFactory(...deps(p.inject));
    else instance = new p.useClass(...deps(p.useClass.inject));

    console.log(`  🆕 造好 ${nameOf(token)}${path.length ? `(为了 ${nameOf(path[path.length - 1]!)})` : ""}`);
    this.instances.set(token, instance);
    return instance as T;
  }
}
