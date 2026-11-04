// 习题 2:DI token 的类型安全 —— 「工牌号」本身不知道该配什么人
//
// 跑:npx tsx src/12-typescript-server/ex2-typed-token.ts
//
// ✍️ 预测(先写在 notes.md 的预测区,再运行):
//   1. 第 1 幕用普通 Symbol 当 token,把一个「假时钟」(now 返回字符串)登记进去,编译器会拦吗?运行时什么时候崩?
//   2. 第 2 幕换成带类型的 token,文件末尾被注释掉的那行如果取消注释,会在哪一步报错?

interface Clock { now(): Date }

// ---------- 第 1 幕:普通 Symbol token —— 登记和取用两头都没有类型检查 ----------
const registry = new Map<symbol, unknown>();
const CLOCK = Symbol("CLOCK");

registry.set(CLOCK, { now: () => "2026-01-01" }); // ❌ 登记了一个不合格的「时钟」,编译器不管
const clock = registry.get(CLOCK) as Clock; // 取的时候靠 as 硬说它是 Clock

console.log("========== 第 1 幕:普通 Symbol token ==========");
console.log("登记、取出都很顺利,clock.now() =", clock.now());
try {
  console.log(clock.now().toISOString()); // 直到真正用到 Date 的方法才崩
} catch (e) {
  console.log("💥 运行时才崩:", (e as Error).message);
}

// ---------- 第 2 幕:带类型的 token —— Symbol 上挂一个「只在编译期存在」的类型标记 ----------
declare const tokenType: unique symbol;
type TypedToken<T> = symbol & { readonly [tokenType]?: T };
const createToken = <T>(description: string) => Symbol(description) as TypedToken<T>;

class TypedRegistry {
  private readonly map = new Map<symbol, unknown>();
  set<T>(token: TypedToken<T>, value: T): void { this.map.set(token, value); } // 值必须符合 token 的类型
  get<T>(token: TypedToken<T>): T { return this.map.get(token) as T; } // as 只写在这一处,外面不用再写
}

const TYPED_CLOCK = createToken<Clock>("CLOCK");
const typed = new TypedRegistry();
typed.set(TYPED_CLOCK, { now: () => new Date("2026-01-01T00:00:00.000Z") });
const c = typed.get(TYPED_CLOCK); // 自动推导出 Clock,不用 as

console.log("\n========== 第 2 幕:带类型的 token ==========");
console.log("c.now().toISOString() =", c.now().toISOString());
console.log("运行时 token 还是普通 Symbol:", typeof TYPED_CLOCK, String(TYPED_CLOCK));

// 取消下一行的注释,再跑 npm run typecheck,看编译器怎么说:
// typed.set(TYPED_CLOCK, { now: () => "2026-01-01" });
