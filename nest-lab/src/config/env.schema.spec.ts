import { envSchema, validateEnv } from './env.schema.js';

// 开店检查单本身也要测:它是全应用第一道关
describe('envSchema / validateEnv', () => {
  it('什么都不给:全部用默认值,类型也转好了', () => {
    expect(validateEnv({})).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DEMO_KEY: 'let-me-in',
      LOG_REQUESTS: true,
      SWAGGER_ENABLED: true, // Day 20:非生产环境默认打开
    });
  });

  it('Day 20:SWAGGER_ENABLED 不写时生产环境默认关闭;显式写了以显式为准', () => {
    expect(validateEnv({ NODE_ENV: 'production', DEMO_KEY: 'a-real-secret-key' }).SWAGGER_ENABLED).toBe(false);
    expect(validateEnv({ NODE_ENV: 'production', DEMO_KEY: 'a-real-secret-key', SWAGGER_ENABLED: 'true' }).SWAGGER_ENABLED).toBe(true);
    expect(validateEnv({ SWAGGER_ENABLED: 'false' }).SWAGGER_ENABLED).toBe(false);
  });

  it('z.coerce.number():字符串 "8080" → 数字 8080', () => {
    expect(validateEnv({ PORT: '8080' }).PORT).toBe(8080);
  });

  it('z.stringbool():字符串 "false" → false(z.coerce.boolean 会错误地得到 true)', () => {
    expect(validateEnv({ LOG_REQUESTS: 'false' }).LOG_REQUESTS).toBe(false);
  });

  it('PORT 不是数字 → 拒绝启动,错误信息指出是哪个变量', () => {
    expect(() => validateEnv({ PORT: 'abc' })).toThrow(/PORT/);
  });

  it('NODE_ENV 拼错 → 拒绝启动', () => {
    expect(() => validateEnv({ NODE_ENV: 'prod' })).toThrow(/NODE_ENV/);
  });

  it('生产环境不许用默认钥匙;设了自己的就可以', () => {
    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(/生产环境必须设置自己的 DEMO_KEY/);
    expect(validateEnv({ NODE_ENV: 'production', DEMO_KEY: 'a-real-secret-key' }).DEMO_KEY).toBe('a-real-secret-key');
  });

  it('多余的变量被丢掉(process.env 里有几十个和我们无关的变量)', () => {
    const parsed = envSchema.parse({ PATH: '/usr/bin', HOME: '/root' });
    expect(parsed).not.toHaveProperty('PATH');
  });
});
