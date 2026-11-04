# nest-lab 数据库连接与超时运维说明(Day 41)

> 实测环境:PostgreSQL 16.15(本机安装,4 核,`max_connections = 100`,其中 3 个留给超级用户)、PgBouncer 1.22.0。
> 复现:`npm run day41`(约 18 秒;会临时启动 / 停止 PgBouncer)。下面的数字是脚本跑 4 遍的区间。
> ⚠️ 这是开发机上的数字:生产环境的核心数、查询耗时、副本数都不同,要按同样的方法重新量。

## 1. 连接数怎么定

| 层 | 设置 | nest-lab 现在 | 说明 |
|---|---|---|---|
| 应用(每个副本) | `DB_POOL_MAX`(`pg.Pool` 的 `max`) | 10 | 直连时:**副本数 × DB_POOL_MAX + 运维 / 迁移 / 监控用的连接 ≤ max_connections − superuser_reserved_connections** |
| PgBouncer | `default_pool_size` | 20 | 每个「库别名 + 用户」最多开几个到 PostgreSQL 的连接。经过 PgBouncer 时,应用的 `DB_POOL_MAX` 只受 `max_client_conn` 约束 |
| PostgreSQL | `max_connections` | 100 | 改它要重启;每个连接是一个后端进程(空闲时 RSS 约 16 MB,其中一部分是共享内存) |

实测(`npm run day41` 第 2–4 幕):

- 6 个副本 × 每池 20 个连接直连 → 95–96 个成功,24–25 个失败:`FATAL 53300 sorry, too many clients already`(最后几个名额报 `remaining connection slots are reserved for roles with the SUPERUSER attribute`)。
- 同样 1200 条 CPU 型查询:2 个连接 387–450 条/秒;5 个 854–935 条/秒;20 个 780–896 条/秒;80 个 738–892 条/秒。p50 延迟从 4.3–4.7 ms(5 个)涨到 87–100 ms(80 个)。**超过核心数之后,吞吐不再上升,只是排队更久。**
- 同样 120 个客户端连接改连 PgBouncer(transaction 模式):600 条查询全部成功,PostgreSQL 里始终只有 20 个来自 PgBouncer 的后端进程。

起点公式(HikariCP 文档里的经验值,Day 27):`连接数 ≈ CPU 核心数 × 2 + 有效磁盘数`。本机约 9–10,和实测「5 个以上吞吐就平了」一致。它是起点,不是答案:要用真实负载量。

## 2. 经过 PgBouncer 运行 nest-lab

```bash
# 终端 1(在 nest-lab 目录;root 下要加 -u <普通用户>)
pgbouncer pgbouncer/pgbouncer.ini
# 终端 2
npm run test:e2e:pgbouncer      # = DATABASE_URL 指向 6432/nest_lab_app_test + DB_STARTUP_SEARCH_PATH=false
```

实测:transaction 模式下 93 / 93 个 e2e 用例通过(连跑 3 遍)。nest-lab 和 transaction 模式兼容,因为:

- 只用不具名的参数化查询(不依赖服务端的具名预备语句;`max_prepared_statements` 开不开都行);
- 事务都在 `transaction()` 里,`BEGIN … COMMIT` 用同一个 client(Day 27 / 36);
- 悲观锁 `updateLocked` 的 `FOR NO KEY UPDATE` 在事务里,事务结束才释放;
- 没有会话级的 `SET`、会话级咨询锁、临时表、`LISTEN`。

**唯一的不兼容**:`pg-pool.ts` 用启动参数 `options=-c search_path=<schema>` 选 schema,PgBouncer 拒绝它:
`FATAL 08P01 unsupported startup parameter in options: search_path`。如果让 PgBouncer 忽略 `options`(`ignore_startup_parameters = options`),
连接能建立,但 `search_path` 被悄悄丢掉,`current_schema()` 变成 `public`,而本库的 `public` 里恰好有一张早期实验留下的 `tasks`。修法(Day 41):

1. `DB_STARTUP_SEARCH_PATH=false`:应用不再发 `options`;
2. schema 由 PgBouncer 的库别名设置:`nest_lab_app = … connect_query='SET search_path = app'`(每个新的服务端连接执行一次;同一个别名下所有服务端连接的 schema 都一样,换哪个都没关系);
3. `PgTasksRepository.onModuleInit` 启动时核对 `current_schema()`,不等于 `DATABASE_SCHEMA` 就拒绝启动。

不能改成「连上以后执行一次 `SET search_path`」:transaction 模式下下一个事务可能分到另一个服务端连接,这句 `SET` 还会留在别人用的连接上(第 5 幕实测)。

## 3. 超时三件套

| 设置 | 管什么 | 到点会怎样 | 建议值(nest-lab 的 API) |
|---|---|---|---|
| `statement_timeout` | 一条语句最多跑多久 | `57014 canceling statement due to statement timeout`,事务进入 aborted | **5s**(Day 34 优化后最慢的查询是几百毫秒;留足余量,又不让一条失控的查询占住连接几分钟) |
| `lock_timeout` | 等锁最多等多久 | `55P03 canceling statement due to lock timeout` | **2s**(比 statement_timeout 短:等锁太久说明有长事务或死锁的苗头,早点失败、让应用重试或报错) |
| `idle_in_transaction_session_timeout` | 事务开着、什么都不做,最多发呆多久 | 服务器断开整个连接:`FATAL 25P03 terminating connection due to idle-in-transaction timeout` | **15s**(nest-lab 的事务里没有外部调用,正常情况下毫秒级;到点说明代码有 bug,断开它好过让它一直挡住 VACUUM、拿着锁、占着 PgBouncer 的服务端连接) |

### 设在哪里

后面的覆盖前面的(第 7 幕实测,`pg_settings.source` 依次是 `database` → `database user` → `client` → `session`):

```
postgresql.conf  <  ALTER DATABASE … SET  <  ALTER ROLE … SET  <  ALTER ROLE … IN DATABASE … SET  <  连接参数 options=-c …  <  SET  <  SET LOCAL
```

推荐:**设在应用专用角色上**(`ALTER ROLE … IN DATABASE … SET`)。

- 直连和经过 PgBouncer 都生效(PgBouncer 的服务端连接也是用这个角色登录的;实测新建的服务端连接看到 `source = database user`)。
- 连接参数 `options` 过不了 PgBouncer;会话级 `SET` 在 transaction 模式下会串。
- 个别慢操作(报表、导出)在自己的事务里用 `SET LOCAL statement_timeout = '30s'` 放宽。

```sql
-- 建议(没有在本仓库执行):应用和迁移用不同的角色
CREATE ROLE nest_lab_app LOGIN PASSWORD '…';                 -- 运行中的服务用它
ALTER ROLE nest_lab_app IN DATABASE nest_lab SET statement_timeout = '5s';
ALTER ROLE nest_lab_app IN DATABASE nest_lab SET lock_timeout = '2s';
ALTER ROLE nest_lab_app IN DATABASE nest_lab SET idle_in_transaction_session_timeout = '15s';
-- 迁移 / db:reset / 灌数据用 owner 角色(nest_lab),不受上面的限制;
-- 线上迁移自己设一个很短的 lock_timeout 并重试(Day 39)
```

**为什么没有直接写进 nest-lab**:本仓库只有一个角色 `nest_lab`,它同时用于 `npm run db:reset`、`db:seed:big`(灌 30 万行)、各天的观察脚本(故意 `pg_sleep`、建索引)。给它设 5s 的 `statement_timeout` 会让这些开发操作失败。真正上线时按上面的 SQL 建一个应用专用角色。Day 41 做实验时设过的角色级 / 库级设置都已经 `RESET`(`pg_db_role_setting` 为空)。

### 应用这边要接住的错误

- `57014`、`55P03`:请求失败。GET 可以重试一次;写操作要看是否幂等(Day 15)。目前 nest-lab 会回 500(problem type `internal`);把它们翻译成 503 + `Retry-After` 之类的细分以后再做。
- `25P03`(连接被断开):`pg-pool` 3.x 会把「已经不能查询的连接」丢掉,下一个请求自动换新连接(第 7 幕实测 `release()` 和 `release(err)` 都恢复了);`transaction()` 里的 `release(err)`(Day 36)照常保留。

### PgBouncer 自己的超时(只列名字,今天没有调)

`query_wait_timeout`(客户端排队等服务端连接最多多久,本配置 30s)、`idle_transaction_timeout`(PgBouncer 这一侧的「事务里发呆」)、`server_idle_timeout`、`client_idle_timeout`、`server_lifetime`。
