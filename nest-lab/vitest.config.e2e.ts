import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    // Day 12:测试用的环境变量写死在这里 —— 不依赖开发者本机的 .env。
    // (process.env 的优先级高于 .env 文件,所以本机 .env 里写了别的钥匙也不影响测试)
    // Day 27:显式写上 TASKS_STORAGE=memory —— 就算本机 .env 里选了 postgres,这套测试也只测内存版(PG 版见 vitest.config.e2e.pg.ts)
    env: { NODE_ENV: 'test', DEMO_KEY: 'let-me-in', LOG_REQUESTS: 'true', TASKS_STORAGE: 'memory' },
    include: ['**/*.e2e-spec.ts'],
  },
});
