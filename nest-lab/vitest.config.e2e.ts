import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    // Day 12:测试用的环境变量写死在这里 —— 不依赖开发者本机的 .env。
    // (process.env 的优先级高于 .env 文件,所以本机 .env 里写了别的钥匙也不影响测试)
    env: { NODE_ENV: 'test', DEMO_KEY: 'let-me-in', LOG_REQUESTS: 'true' },
    include: ['**/*.e2e-spec.ts'],
  },
});
