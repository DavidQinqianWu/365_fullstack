import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Day 27:同一套 e2e,换成 PostgreSQL 版仓储再跑一遍(npm run test:e2e:pg)。
// 和 vitest.config.e2e.ts 只差三件事:
//   ① TASKS_STORAGE=postgres,表放在独立的 schema app_test(不碰开发用的 app)
//   ② DB_RESET_ON_START=true:每次创建 app 时清空任务表并写入样品数据 —— 和内存版「每个 app 一个新数组」等价
//   ③ fileParallelism: false:所有测试文件共用一个数据库,不能并行(内存版每个文件各有各的数组,可以并行)
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    env: {
      NODE_ENV: 'test',
      DEMO_KEY: 'let-me-in',
      LOG_REQUESTS: 'true',
      TASKS_STORAGE: 'postgres',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://nest_lab:nest_lab_dev@localhost:5432/nest_lab',
      DATABASE_SCHEMA: 'app_test',
      DB_POOL_MAX: '5',
      DB_RESET_ON_START: 'true',
    },
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
  },
});
