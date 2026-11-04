import { Inject, Module, type OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type pg from 'pg';
import type { Env } from '../config/env.schema.js';
import { createPool, PG_POOL } from './pg-pool.js';

// Day 27:数据库连接池做成一个 Provider(Day 9 的 useFactory + Day 12 的带类型 token)。
// 池子创建时不会连数据库:第一次 query 时才真正建连接。所以 TASKS_STORAGE=memory 时它只是一个闲置的对象。
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: (config?: ConfigService<Env, true>): pg.Pool =>
        createPool({
          // memory 模式下可能没有 DATABASE_URL;那时池子永远不会被用到
          connectionString: config?.get('DATABASE_URL', { infer: true }) ?? 'postgresql://localhost/unused',
          schema: config?.get('DATABASE_SCHEMA', { infer: true }) ?? 'app',
          max: config?.get('DB_POOL_MAX', { infer: true }) ?? 10,
          // Day 41。和 'false' 比较:测试里整个换掉 ConfigService 时(Day 12),没列出的项会退回读 process.env,拿到的是字符串
          searchPathAtStartup: String(config?.get('DB_STARTUP_SEARCH_PATH', { infer: true }) ?? true) !== 'false',
        }),
      // optional:单元测试里只导入 TasksModule、没有 ConfigModule 时,也能造出来
      inject: [{ token: ConfigService, optional: true }],
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Optional() @Inject(PG_POOL) private readonly pool?: pg.Pool) {}

  // 关店时(app.close())把所有连接还给数据库;不关的话,进程会因为还有打开的 socket 退不出去(Day 5)
  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
