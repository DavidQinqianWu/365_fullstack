// 习题 1:不用 Nest、不用 reflect-metadata,30 行手写 SetMetadata + Reflector,看清「贴」和「读」
//
// 跑:npx tsx src/11-custom-decorators/ex1-mini-reflector.ts
//
// 说明:这里用的是 JS 标准(TC39)装饰器 —— 根目录 tsconfig 没开 experimentalDecorators,tsx 也直接支持。
// Nest 用的是 TS 旧版实验装饰器 + reflect-metadata(Day 8 讲过),写法细节不同,但「贴 / 读」的思想一模一样。
//
// ✍️ 预测(先写在 notes.md 的预测区,再运行):
//   1. 「📌 贴标签」这几行,会在「第 1 幕」标题之前还是之后打印?会打印几次?
//   2. 第 2 幕三个方法各自读到的 roles 是什么?(类上贴了 staff,adminZone 方法上贴了 admin)
//   3. 第 3 幕用拼错的 key 'isPubilc' 贴标签,保安读 'isPublic' 能读到吗?程序会报错吗?

// ---------- 「隐形标签表」:目标(类或方法)→ { key: value } ----------
const store = new WeakMap<object, Map<string, unknown>>();

// SetMetadata:返回一个装饰器,作用是把 (key, value) 写进标签表。类和方法都能贴。
function SetMetadata(key: string, value: unknown) {
  return (target: object, context: ClassDecoratorContext | ClassMethodDecoratorContext) => {
    console.log(`  📌 贴标签 ${key}=${JSON.stringify(value)} → ${String(context.name)}`);
    if (!store.has(target)) store.set(target, new Map());
    store.get(target)!.set(key, value);
  };
}

// Reflector:读标签。getAllAndOverride = 按顺序找,第一个有值的胜出(方法优先,类兜底)
const reflector = {
  get: <T>(key: string, target: object): T | undefined => store.get(target)?.get(key) as T | undefined,
  getAllAndOverride<T>(key: string, targets: object[]): T | undefined {
    for (const t of targets) {
      const v = this.get<T>(key, t);
      if (v !== undefined) return v;
    }
    return undefined;
  },
};

const Roles = (...roles: string[]) => SetMetadata("roles", roles);
const Public = () => SetMetadata("isPublic", true);

@Roles("staff")
class ShopController {
  @Public()
  menu() {}

  staffZone() {}

  @Roles("admin")
  adminZone() {}

  @SetMetadata("isPubilc", true) // ❌ 拼错了
  typo() {}
}

console.log("\n========== 第 1 幕:类已经定义好了,还没有任何「请求」 ==========");
console.log("(往上看:📌 是什么时候打印的?)");

console.log("\n========== 第 2 幕:保安按「方法优先、类兜底」读 roles ==========");
const p = ShopController.prototype;
for (const name of ["menu", "staffZone", "adminZone"] as const) {
  const roles = reflector.getAllAndOverride<string[]>("roles", [p[name], ShopController]);
  const isPublic = reflector.get<boolean>("isPublic", p[name]) ?? false;
  console.log(`  ${name.padEnd(9)} roles=${JSON.stringify(roles)}  isPublic=${isPublic}`);
}

console.log("\n========== 第 3 幕:拼错 key 的后果 ==========");
console.log("  按 'isPublic' 读 typo:", reflector.get("isPublic", p.typo));
console.log("  按 'isPubilc' 读 typo:", reflector.get("isPubilc", p.typo));
console.log("  → 标签确实贴上了,只是贴在了一个没人读的 key 上。没有任何报错。");
