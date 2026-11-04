import { z } from 'zod';

// 开店检查单:所有环境变量在这里登记一次 —— 一份定义两用:
//   ① 运行时校验(启动时逐项核对,不合格就不开门)
//   ② 编译期类型(z.infer 自动推导出 Env,不用再手写一遍 interface)
//
// 记住:process.env 里永远是字符串(或者干脆没有)。数字、布尔都要显式转换。
export const DEFAULT_DEMO_KEY = 'let-me-in';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // '3000' → 3000;'abc' 转不成数字就报错。0 = 让系统挑一个空闲端口(观察脚本用)
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),
    // Day 10 的钥匙不再写死在代码里。开发 / 测试有默认值,生产环境必须自己设(见下面的 superRefine)
    DEMO_KEY: z.string().min(8, '至少 8 个字符').default(DEFAULT_DEMO_KEY),
    // 'true' / 'false' / '1' / '0' / 'yes' / 'no' → boolean。
    // ⚠️ 不要用 z.coerce.boolean():它等于 Boolean('false'),非空字符串全是 true
    LOG_REQUESTS: z.stringbool().default(true),
  })
  .superRefine((env, ctx) => {
    // 按 NODE_ENV 分支的规则:生产环境不许用演示钥匙
    if (env.NODE_ENV === 'production' && env.DEMO_KEY === DEFAULT_DEMO_KEY) {
      ctx.addIssue({ code: 'custom', path: ['DEMO_KEY'], message: '生产环境必须设置自己的 DEMO_KEY,不能用默认值' });
    }
  });

// 从 schema 推导出来的类型:{ NODE_ENV: 'development' | 'test' | 'production'; PORT: number; DEMO_KEY: string; LOG_REQUESTS: boolean }
export type Env = z.infer<typeof envSchema>;

// 给 ConfigModule.forRoot({ validate }) 用:不合格就抛错,Nest 启动直接失败(fail fast)
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`环境变量校验失败,拒绝启动:\n${lines.join('\n')}`);
  }
  return result.data;
}
