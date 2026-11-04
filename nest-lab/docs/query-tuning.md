# nest-lab 查询优化报告(Day 34)

> 方法:先测量,再优化。用 `pg_stat_statements` 找「一共花时间最多」的语句 → 用 `EXPLAIN (ANALYZE, BUFFERS)` 看它为什么慢 → 改 → 再测一遍。
> 环境:PostgreSQL 16.15(本机安装)、schema `app`、`npm run db:seed:big` 灌的 30 万任务 + 24 万条清单项(表 21 MB,全部在内存缓存里,`shared_blks_read` 几乎为 0)。
> 负载:`npm run load`(8 个并发,按比例打 15 种请求,见 `scripts/load-tasks.mjs`)。复现:`npm run day34`(约 30 秒)。
> 计时:`EXPLAIN (ANALYZE)` 的 Execution Time,各跑 3 次、脚本跑 3 遍,写区间;标「单次」的是只跑了一次的计划。
> ⚠️ 这是开发机上的数据量和负载,结论要在生产规模复验:生产数据更大、缓存不一定全命中、请求比例也不同。

## 0. 优化前:pg_stat_statements 说了什么

修改前的代码(`keysetCondition` 还没修)、只有两个主键、统计信息是默认设置。负载 10 秒,共 833 个请求(83 个/秒)。按总耗时排序:

| 次数 | 总耗时 ms | 平均 ms | 语句(省略相同的 `SELECT_TASKS` 前缀) |
|---:|---:|---:|---|
| 158 | 24623 | 155.84 | `WHERE t.title ILIKE $1 ESCAPE $7 ORDER BY t.id ASC LIMIT $2` |
| 135 | 14798 | 109.61 | `ORDER BY t.created_at DESC, t.id ASC LIMIT $1` |
| 42 | 10181 | 242.41 | `ORDER BY t.title COLLATE "C" ASC, t.id ASC LIMIT $1` |
| 94 | 6019 | 64.03 | `WHERE t.done = $1 ORDER BY t.created_at DESC, t.id ASC LIMIT $2` |
| 44 | 1815 | 41.24 | `WHERE t.done = $1 AND ((t.created_at < $2) OR (…)) ORDER BY …`(深分页) |
| 36 | 1779 | 49.42 | `WHERE ((t.created_at < $1) OR (…)) ORDER BY …`(深分页) |
| 261 | 14 | 0.05 | `WHERE t.id = $1` |
| 111 | 13 | 0.12 | `ORDER BY t.id ASC LIMIT $1` |
| 47 | 5 | 0.10 | `UPDATE tasks SET done = $2 WHERE id = $1` |
| 46 | 4 | 0.09 | `INSERT INTO tasks … RETURNING id` |

读法:
- 前四条占了总耗时的 9 成以上。按「次数 × 平均」排,而不是按「最慢的一次」排:`sort=title` 平均最慢(242 ms),但调用少,总耗时排第三。
- `?q=` 的各种关键词(urgent / invoice / 发票导出 / 加急)被**规范化成同一行**(字面值都变成了 `$1`)。这一行的平均值把「很快的」和「很慢的」混在了一起,要拆开看,得回到 EXPLAIN 或者应用层的日志。
- 按主键取一条、按 id 排的第一页、写操作都在 0.2 ms 以内,不用管。

## 1. 逐条优化

「优化前」是在事务里删掉三个新索引、测完再回滚(`ROLLBACK`),所以和「优化后」用的是同一份数据。

### 1.1 `?sort=-createdAt` 第一页(总耗时第 2)

- **问题**:没有按 `created_at` 排好序的索引。要把 30 万行全扫一遍再排序,排序还溢出到了磁盘(`Sort Method: external merge  Disk: 8584kB`)。LATERAL 子查询夹在 Limit 和 Sort 之间,所以连 top-N 排序都用不上。
- **证据**:优化前 41.2 – 62.5 ms;`Parallel Seq Scan` + `Sort`,`temp written=2083`。
- **改法**:`CREATE INDEX tasks_created_at_id_idx ON tasks (created_at, id);`
- **优化后**:0.055 – 0.456 ms。计划是 `Index Scan Backward` + `Incremental Sort (Presorted Key: t.created_at)`,读够 21 行就停。
- **为什么不按 Day 31 的建议建成 `(created_at DESC, id)`**:
  - `-createdAt` 补上 tie-breaker 后是 `created_at DESC, id ASC`,方向混合。照理该声明成同样的方向,省掉 Incremental Sort。
  - 但新任务的 `created_at` 总是最大的,在 DESC 索引里每次都插在最左边,页分裂只能对半分。实测逐行插入 30 万行后,DESC 索引 16 MB,ASC 只有 9.2 MB;REINDEX 之后两者都是 9.3 MB。
  - Incremental Sort 只需要给「时间完全相同的几行」排序,这里几乎没有时间相同的行,代价可以忽略。
- **代价**:9.2 MB;每次 INSERT 都要维护它。

### 1.2 深分页 `?sort=-createdAt&cursor=…`:修 `keysetCondition`(Day 31 发现的 bug)

- **问题**:方向混合时,keyset 条件被展开成 `created_at < $1 OR (created_at = $1 AND id > $2)`。OR 只能当 `Filter`,即使有索引,也要从最新的一条开始扫、一路扔掉书签之前的所有行。
- **证据**(索引都在,只差 SQL 写法):
  - 修复前:`Index Scan Backward … Filter: (… OR …)  Rows Removed by Filter: 297001`,28.5 – 37.9 ms。
  - 修复后:`Index Cond: (created_at <= '…')`,Rows Removed by Filter 只有 1 行,0.056 – 0.202 ms。
- **改法**(`src/tasks/pg-tasks.repository.ts`):在 OR 前面补一个第一排序列的冗余范围条件,写成 `created_at <= $1 AND (created_at < $1 OR (created_at = $1 AND id > $2))`。第一列升序时用 `>=`。它是 OR 的必要条件,结果不变。
- **测试**:
  - `src/tasks/pg-tasks.repository.spec.ts`:新增,断言三种生成的 SQL 片段,以及同一个参数只传一次。
  - `test/pagination.e2e-spec.ts`:新增「`sort=createdAt,-id` 一路翻到底,不重不漏、顺序正确」,走的是 `>=` 分支。内存版和 PG 版都跑。
  - 原有的「`sort=-createdAt` 一路翻到底(createdAt 有大量相同值)」「`sort=-title` + 过滤」在 `test:e2e:pg` 上继续通过,证明修复没有改变结果。
- **代价**:无(只是 SQL 写法)。

### 1.3 `?sort=title` 第一页(总耗时第 3)

- **问题**:同 1.1,全表排序。
- **证据**:优化前 81.1 – 98.1 ms。
- **改法**:`CREATE INDEX tasks_title_c_id_idx ON tasks (title COLLATE "C", id);`。排序表达式是 `title COLLATE "C"`(Day 27),索引必须用同样的排序规则才会被用上。
- **优化后**:0.055 – 0.420 ms,`Index Scan using tasks_title_c_id_idx`,没有 Sort。
- **代价**:27 MB,是三个新索引里最大的。标题是乱序插入的,加上键比较长(标题 + id)。PATCH / PUT 改标题时,这个索引和 trigram GIN 都要更新,这样的更新也不再是 HOT 更新(Day 32)。
- **说明**:负载里 `sort=title` 只占约 1/20 的请求。在真实系统里,如果没人按标题排序,这是第一个该删的索引。上线后用 `pg_stat_user_indexes.idx_scan` 观察一段时间再决定(Day 32)。

### 1.4 `?q=`(总耗时第 1)

**改法**:
- `CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;`(受信任的扩展,库的 owner 就能建)
- `CREATE INDEX tasks_title_trgm_idx ON tasks USING gin (title public.gin_trgm_ops);`(`search_path` 只有 app,所以操作符类写全名)
- `ALTER TABLE tasks ALTER COLUMN title SET STATISTICS 1000;`(见下面「一次回退」)

**SQL 不用改**:nest-lab 发的是不具名的参数化查询,数据库带着参数值做计划(Day 32 / 33 已实测),能直接用上 GIN。

**优化前后**(默认按 id 排,`LIMIT 21`):

| 关键词 | 命中 | 优化前 | 优化后 | 优化后的计划 |
|---|---:|---|---|---|
| `12345` | 13 行 | 71.9 – 99.8 ms | **0.119 – 0.644 ms** | GIN 位图 |
| `不存在的任务` | 0 行 | 77.0 – 90.0 ms | **0.018 – 0.204 ms** | GIN 位图 |
| `urgent` | 约 300 行(0.1%) | 6.7 – 16.9 ms | 6.8 – 12.1 ms | 按主键顺序扫、边扫边过滤 |
| `加急`(2 个字) | 约 300 行 | 7.2 – 8.8 ms | 7.2 – 11.9 ms | 同上(抽不出三元组,GIN 本来也用不上) |
| `invoice` | 约 1.5 万行(5%) | 不受影响:按主键扫,0.38 ms(单次) | 同左 | 同上 |

- **GIN 真正派上用场的,是「很少或没有结果」的搜索**,比如用户拼错了、搜一个编号:从全表扫描的 70–100 ms 降到 1 ms 以内。
- 命中 0.1% 以上的词,按主键顺序扫、扫到第 21 条就停,本来就不慢,GIN 帮不上。

**一次回退,以及修复**:
- **现象**:第一次建好 GIN 后,负载下 `q=invoice` 的 HTTP p50 反而从约 20 ms 变成了 77–123 ms(3 遍里有 2 遍)。
- **原因**:
  - 优化器估算 `ILIKE '%invoice%'` 命中多少行,靠的是 ANALYZE 的随机抽样。默认统计目标(100)下,同一份数据连续 ANALYZE 5 次,估算值是 30、3031、12125、18187、27281 行,实际是 15060 行。
  - 估成 30 行的那一次,优化器选了「GIN 取出全部 1.5 万行 → 排序」(强制走这个计划时单次 23.7 ms),而不是「按主键扫、凑够就停」(0.4 ms)。
  - `urgent`、`加急` 也一样,在 7 ms 的计划和 75–110 ms 的全表扫描之间跳。
- **修复**:`ALTER TABLE tasks ALTER COLUMN title SET STATISTICS 1000`。再连续 ANALYZE 5 次,`invoice` 的估算稳定在 15320 行,5 次都选了快的计划;`加急` 也从多数时候全表扫描,变成多数时候按主键扫。
- **代价**:ANALYZE 抽样更多、稍慢,统计信息占的空间更大,计划时间多一点点。

**常见词 + 排序**(`?q=invoice&sort=-createdAt`):
- 优化器选「按 `(created_at, id)` 倒着扫、边扫边过滤」,扫 519 行凑够一页,0.47 ms(单次)。
- 强行走 GIN(`enable_indexscan = off`)时,要先取出全部 15060 行匹配的、再排序,23.7 ms(单次)。
- 少见词 + 排序(`urgent&sort=-createdAt`)是统计目标调高后**变差**的一个例子:
  - 默认统计目标时,优化器选了 GIN(取出约 300 行再排序),2.6 ms(单次)。
  - 调到 1000 后,估算更准了(约 300 行),优化器却改成「按时间倒着扫、凑够 21 条」,实际扔掉了 40443 行,20.0 ms(单次)。
  - 原因是优化器假设匹配的行均匀分布在时间线上,估计扫约 2 万行就能凑够,实际扫了 4 万多行。
  - 这是成本模型的局限,不是统计不准。权衡下来,常见词变快(更常见)比这一种组合变慢更重要,所以保留了这个设置。
- 两个索引各管一种情况,由优化器按估算来选;估算和成本模型都可能出错,所以上线后要持续看 `pg_stat_statements`。

**代价**:17 MB;每次插入、改标题都要拆十几个三元组写进 GIN(Day 33:写入比 B-tree 慢 3–4 倍)。

#### 短关键词(1–2 个字符)的决定:**接受,不改 DTO**

- **不改的理由**:
  - 中文里 2 个字的词很常见(「登录」「支付」「加急」),都是合理的搜索。
  - 给 `q` 加 `@MinLength(3)`,会让以前合法的请求变成 422,这是破坏性的契约变更:`openapi.json`、客户端提示文案都要跟着改。
- **实测代价**:
  - 统计目标调高以后,`加急` 这种命中 0.1% 的短词走「按主键扫、凑够就停」,7–12 ms,负载下 HTTP p50 21–23 ms,可以接受。
  - 最坏的情况是**命中很少或没有结果的短词**:要扫完整张表才知道凑不够一页,和优化前的 `12345` 一样是 70–100 ms。这种请求在负载脚本里没有模拟。
- **下一步的候选**(都没做,也没实测):专门做 2 字符索引的 `pg_bigm` 扩展;中文分词(zhparser / pg_jieba)+ 全文搜索;在 v3 接口里引入最短长度。
- **决定之前先要数据**:`pg_stat_statements` 把所有关键词合成了一行,拆不出「短词占多少、其中多少没结果」,需要在应用层按 `q` 的长度和结果数打日志或打指标(Week 19 的可观测性)。

### 1.5 `?done=false&sort=-createdAt`(总耗时第 4):**不建专门的索引**

- **优化前**:64 ms 左右(全表扫描 + 排序)。
- **优化后**:没有为 `done` 建任何索引,只靠 1.1 的 `(created_at, id)`:
  - 第一页倒着扫、`Filter: (NOT done)`,扔掉 19 行就凑够一页,0.139 ms(单次)。
  - 深分页(带冗余范围条件)在负载下平均 0.82 – 0.87 ms。
- **为什么不建 `WHERE done = false` 的部分索引,或 `(done, created_at)`**:
  - 未完成的约占 27%,按时间顺序扫很快就能凑够一页,再建一个索引只是多一份写入成本。
  - 改 `done`(PATCH)本来就是最常见的写操作;部分索引的条件列会让这类更新不能 HOT(Day 32)。
- **什么时候要重新考虑**:如果未完成的比例掉到 1% 以下,扫很久才凑够一页。到时候看 `pg_stat_statements` 里这条语句的平均耗时再决定。

### 1.6 offset vs keyset(为什么 Day 19 选了 cursor)

nest-lab 对外只有 keyset。用 SQL 对比「第 10001 页」(每页 20 条):

| 写法 | 耗时 | 计划 |
|---|---|---|
| `ORDER BY created_at, id LIMIT 20 OFFSET 200000` | 17.8 – 28.1 ms | Index Scan,`rows=200020`:先数过 20 万行再扔掉 |
| `WHERE (created_at, id) > (书签) ORDER BY … LIMIT 20` | 0.008 – 0.073 ms | `Index Cond: (ROW(created_at, id) > …)`,只读 20 行 |

两种写法拿到的是同一页(SQL 比对结果为 `t`)。offset 的耗时随页码线性增长,keyset 不随页码变化;而且 offset 在翻页过程中有新增时会重复或漏项(Day 19)。

## 2. 加负载的整体效果

`npm run day34` 的第 4 幕:同样的代码(keyset 已修、统计目标已调),只差这三个索引,8 个并发 × 6 秒,跑了 3 遍:

| | 吞吐 | `sort=-createdAt` p50 | `sort=title` p50 | `q=12345` p50 | `q=没有结果` p50 | `q=加急` p50 |
|---|---|---|---|---|---|---|
| 没有这 3 个索引 | 84 – 91 个/秒 | 131 – 150 ms | 235 – 264 ms | 223 – 255 ms | 217 – 251 ms | 41 – 49 ms |
| 有这 3 个索引 | 619 – 686 个/秒 | 8.9 – 9.8 ms | 8.5 – 9.5 ms | 8.9 – 11.0 ms | 9.3 – 10.6 ms | 21 – 23 ms |

优化后的 `pg_stat_statements`(3 遍):
- `?q=` 那一行仍然排第一,占数据库总耗时的 89–90%,但平均从 155.8 ms 降到 3.6 – 4.1 ms。
- 其余语句的平均都在 1 ms 以内。

要说明的几点:
- HTTP 的耗时里还有应用层的开销:校验、JSON 序列化、连接池排队。数据库里只要 0.1 ms 的「按 id 排的第一页」,HTTP p50 也要 8–10 ms。`pg_stat_statements` 只统计数据库内部的耗时,看不到这一部分。
- 负载脚本和应用跑在同一台机器上,吞吐的绝对值没有参考意义,只看相对变化。
- 优化前 `PATCH` / `POST` 的 p50(37–70 ms)比优化后(17–20 ms)还慢。不是因为写得更快了,而是读请求不再占着连接,排队少了。在写多读少的系统里,结论可能相反。

## 3. 代价

- **空间**:三个新索引合计约 53 MB(9.2 + 27 + 17),是表本身(21 MB)的 2.5 倍。
- **写入**:
  - 在事务里一次插入 1 万个任务:没有这三个索引时 17.2 – 29.1 ms,有它们时 115.1 – 178.6 ms,慢 5–8 倍。主要是 trigram GIN 和标题索引。
  - `db:seed:big` 灌 30 万行:没有它们时约 3.6 秒,有它们时约 8 秒。
- **统计目标**:`title` 的 `SET STATISTICS 1000` 让 ANALYZE 多抽样、统计信息多占空间。没有单独计时。

## 4. 已建 / 未建的索引

| 索引 / 设置 | 状态 | 服务哪些请求 | 理由 |
|---|---|---|---|
| `tasks_pkey (id)` | 已有 | `GET /tasks/:id`、默认排序、PATCH / PUT / DELETE、常见词的 `?q=` | 主键 |
| `checklist_items_pkey (task_id, position)` | 已有 | 读清单项(LATERAL)、删任务时的级联删除 | 以外键列打头,外键不用另建索引(Day 32) |
| `tasks_created_at_id_idx (created_at, id)` | **新建** | `±createdAt` 第一页 / 深分页、`done=false&sort=-createdAt`、常见词 + 按时间排序 | 优化前总耗时第 2、4、5、6 名都靠它 |
| `tasks_title_c_id_idx (title COLLATE "C", id)` | **新建** | `±title`、前缀 LIKE | 优化前总耗时第 3;27 MB,是第一个该用 `idx_scan` 复核的 |
| `tasks_title_trgm_idx gin (title gin_trgm_ops)` | **新建** | `?q=` 中命中很少或没有结果的(3 个字符以上) | 优化前总耗时第 1 |
| `title` 的 `SET STATISTICS 1000` | **新设** | `?q=` 的计划选择 | 默认抽样下估算差几百倍,选错计划 |
| `(created_at DESC, id)` | 不建 | — | 按时间追加时每次都插在最左边,16 MB vs 9.2 MB;Incremental Sort 几乎免费 |
| `(title COLLATE "C" DESC, id)` | 不建 | — | `-title` 倒着读 1.3 的索引 + Incremental Sort |
| `(done)`、`(done, created_at)`、`WHERE done = false` 的部分索引 | 不建 | — | 未完成约占 27%,1.1 的索引 + Filter 已在 1 ms 以内;改 `done` 的写入最频繁 |
| trigram **GiST** | 不建 | — | 只做包含查询时 GIN 更快;不需要按相似度排序(Day 33) |
| 全文搜索 `to_tsvector(...)` 的 GIN | 不建 | — | 标题有中文,PostgreSQL 默认不分中文词(Day 33) |
| 针对 1–2 字符的索引(`pg_bigm` 等) | 不建 | — | 没有安装、没有实测;先用数据确认短词的占比 |
| `pg_stat_statements` 写进 `schema.sql` | 不写 | — | 它要超级用户和 `shared_preload_libraries`,属于数据库实例的配置,不属于应用的表结构 |

## 5. 遗留问题

- **`GET /v1/tasks`**(已标记 Deprecation / Sunset)仍然一次返回全部任务。
  - 30 万行时,数据库这一侧就要 820 ms(单次,只算 SQL),还没算序列化成 JSON 的时间。
  - 负载里没有打它。下线之前,如果日志里还有调用,应该先限制条数或直接下线(Day 19 的下线流程)。
- **命中很少或没有结果的短关键词**:见 1.4,最坏 70–100 ms。
- **统计目标是「调到够用」,不是根治**:数据分布变了(比如标题的写法变了),估算还可能偏。上线后定期看 `pg_stat_statements` 里 `?q=` 那一行的 `stddev_exec_time` 和 `max_exec_time`。
