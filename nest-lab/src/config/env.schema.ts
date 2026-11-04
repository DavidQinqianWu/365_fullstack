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
    // Day 20:是否开放 Swagger UI(/docs)和 OpenAPI JSON(/docs-json)。不写时:生产环境关闭,其他环境打开
    SWAGGER_ENABLED: z.stringbool().optional(),

    // ---------- Day 27:任务数据存在哪 ----------
    // memory:Day 9 的内存仓储(默认:测试和 day08–day20 的观察脚本不需要数据库)
    // postgres:PgTasksRepository,需要下面的 DATABASE_URL
    TASKS_STORAGE: z.enum(['memory', 'postgres']).default('memory'),
    // 连接串:postgresql://用户:密码@主机:端口/库名(和 .env.example 里的 POSTGRES_* 对齐)
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: '必须是 postgresql://… 形式的连接串' }).optional(),
    // 表放在哪个 schema(Day 22 的「柜子」)。e2e:pg 用 app_test,和开发数据分开。
    // 它会被拼进连接参数(search_path),schema 名不能参数化,所以只允许小写字母、数字、下划线 —— 白名单
    DATABASE_SCHEMA: z
      .string()
      .regex(/^[a-z_][a-z0-9_]{0,62}$/, '只允许小写字母、数字、下划线,且不能以数字开头')
      .default('app'),
    // 连接池最多同时开几个连接(每个连接在 PG 那边是一个进程,Day 22)
    DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
    // Day 41:建连接时是否用启动参数 options=-c search_path=… 选 schema。
    //   true(默认):直连 PostgreSQL 时用
    //   false:经过 PgBouncer 时用 —— PgBouncer 拒绝 options 里的 search_path(08P01 unsupported startup parameter),
    //          schema 改由 PgBouncer 的库别名 connect_query 设置(pgbouncer/pgbouncer.ini)。
    //   两种情况下应用启动时都会检查 current_schema() 是不是 DATABASE_SCHEMA,不是就拒绝启动(PgTasksRepository)
    DB_STARTUP_SEARCH_PATH: z.stringbool().default(true),
    // 启动时清空任务表并写入样品数据 —— 让 PG 版和内存版一样「每次开店都是一个新冰柜」。
    // 只给 e2e:pg 和观察脚本用;生产环境禁止(见 superRefine)
    DB_RESET_ON_START: z.stringbool().default(false),
  })
  .superRefine((env, ctx) => {
    // 按 NODE_ENV 分支的规则:生产环境不许用演示钥匙
    if (env.NODE_ENV === 'production' && env.DEMO_KEY === DEFAULT_DEMO_KEY) {
      ctx.addIssue({ code: 'custom', path: ['DEMO_KEY'], message: '生产环境必须设置自己的 DEMO_KEY,不能用默认值' });
    }
    // Day 27:选了 postgres,就必须告诉我数据库在哪
    if (env.TASKS_STORAGE === 'postgres' && !env.DATABASE_URL) {
      ctx.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'TASKS_STORAGE=postgres 时必须设置 DATABASE_URL' });
    }
    if (env.NODE_ENV === 'production' && env.DB_RESET_ON_START) {
      ctx.addIssue({ code: 'custom', path: ['DB_RESET_ON_START'], message: '生产环境禁止在启动时清空数据' });
    }
  })
  // 依赖其他字段的默认值:放在 transform 里算(z.infer 出来的 SWAGGER_ENABLED 因此是 boolean,不是 boolean | undefined)
  .transform((env) => ({ ...env, SWAGGER_ENABLED: env.SWAGGER_ENABLED ?? env.NODE_ENV !== 'production' }));

// 从 schema 推导出来的类型:{ NODE_ENV: …; PORT: number; DEMO_KEY: string; LOG_REQUESTS: boolean; SWAGGER_ENABLED: boolean;
//   TASKS_STORAGE: 'memory' | 'postgres'; DATABASE_URL?: string; DATABASE_SCHEMA: string; DB_POOL_MAX: number; DB_RESET_ON_START: boolean }
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
