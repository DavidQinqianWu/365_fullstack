-- Day 34 · 02:nest-lab 的几条热点查询,优化前 / 后的执行计划
-- 前提:npm run db:seed:big(schema app,30 万任务;schema.sql 里已经有 Day 34 的三个索引)。
-- 「优化前」= 在一个事务里先 DROP 掉这三个索引,EXPLAIN 完再 ROLLBACK(DDL 在 PostgreSQL 里也能回滚,索引原样回来)。
--   ⚠️ 事务里 DROP INDEX 会锁住整张表,只在开发库这么玩。
-- SQL 和 nest-lab 实际发出的一样(src/tasks/pg-tasks.repository.ts 的 SELECT_TASKS + WHERE / ORDER BY / LIMIT 21),
-- 只是把 $1 换成了字面值。
SET search_path = app;
SET client_min_messages = warning;
\set S 'SELECT t.id, t.title, t.done, t.created_at, coalesce(cl.items, ''[]''::json) AS checklist FROM tasks t LEFT JOIN LATERAL (SELECT json_agg(json_build_object(''text'', c.text, ''done'', c.done) ORDER BY c.position) AS items FROM checklist_items c WHERE c.task_id = t.id) cl ON true'
-- 深分页的书签:3000 号任务(按 -createdAt 排,它前面有 29.7 万条)
SELECT created_at AS bm FROM tasks WHERE id = 3000 \gset

\echo '############ 优化前(三个索引都不在) ############'
BEGIN;
DROP INDEX tasks_created_at_id_idx, tasks_title_c_id_idx, tasks_title_trgm_idx;
\echo '=== A. ?sort=-createdAt 第一页'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) :S ORDER BY t.created_at DESC, t.id ASC LIMIT 21;
\echo '=== B. ?sort=title 第一页'
EXPLAIN (ANALYZE, COSTS OFF) :S ORDER BY t.title COLLATE "C" ASC, t.id ASC LIMIT 21;
\echo '=== C. ?q=urgent(默认按 id 排)'
EXPLAIN (ANALYZE, COSTS OFF) :S WHERE t.title ILIKE '%urgent%' ESCAPE '\' ORDER BY t.id ASC LIMIT 21;
\echo '=== C4. ?q=12345(只有十几条)'
EXPLAIN (ANALYZE, COSTS OFF) :S WHERE t.title ILIKE '%12345%' ESCAPE '\' ORDER BY t.id ASC LIMIT 21;
ROLLBACK;

\echo '############ 优化后 ############'
\echo '=== A. ?sort=-createdAt 第一页:倒着读 (created_at, id),相同时间的几行再排一次(Incremental Sort)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) :S ORDER BY t.created_at DESC, t.id ASC LIMIT 21;
\echo '=== A2. ?sort=-createdAt 深分页 —— 修复前的 SQL(只有 OR)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) :S
WHERE ((t.created_at < :'bm'::timestamptz) OR (t.created_at = :'bm'::timestamptz AND t.id > 3000::bigint))
ORDER BY t.created_at DESC, t.id ASC LIMIT 21;
\echo '=== A3. ?sort=-createdAt 深分页 —— 修复后的 SQL(OR 前面多一个 created_at <= 书签)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) :S
WHERE (t.created_at <= :'bm'::timestamptz AND ((t.created_at < :'bm'::timestamptz) OR (t.created_at = :'bm'::timestamptz AND t.id > 3000::bigint)))
ORDER BY t.created_at DESC, t.id ASC LIMIT 21;
\echo '=== A4. ?done=false&sort=-createdAt 第一页(没有专门给 done 建索引)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) :S WHERE t.done = false ORDER BY t.created_at DESC, t.id ASC LIMIT 21;
\echo '=== B. ?sort=title 第一页'
EXPLAIN (ANALYZE, COSTS OFF) :S ORDER BY t.title COLLATE "C" ASC, t.id ASC LIMIT 21;
\echo '=== C. ?q=urgent(少见)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) :S WHERE t.title ILIKE '%urgent%' ESCAPE '\' ORDER BY t.id ASC LIMIT 21;
\echo '=== C4. ?q=12345(只有十几条):GIN 真正派上用场的地方'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) :S WHERE t.title ILIKE '%12345%' ESCAPE '\' ORDER BY t.id ASC LIMIT 21;
\echo '=== C5. ?q=不存在的任务(一条都没有;用户拼错时常见)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) :S WHERE t.title ILIKE '%不存在的任务%' ESCAPE '\' ORDER BY t.id ASC LIMIT 21;
\echo '=== C2. ?q=invoice(常见,约 5%)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) :S WHERE t.title ILIKE '%invoice%' ESCAPE '\' ORDER BY t.id ASC LIMIT 21;
\echo '=== C3. ?q=加急(2 个字,抽不出三元组)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) :S WHERE t.title ILIKE '%加急%' ESCAPE '\' ORDER BY t.id ASC LIMIT 21;
\echo '=== D. 常见词 + 排序:?q=invoice&sort=-createdAt —— 优化器选的计划'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) :S WHERE t.title ILIKE '%invoice%' ESCAPE '\' ORDER BY t.created_at DESC, t.id ASC LIMIT 21;
\echo '--- D2. 同一个查询,不让它按索引顺序扫(enable_indexscan = off,只为学习):只剩 GIN 位图 → 取出全部匹配行 → 排序'
SET enable_indexscan = off;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) :S WHERE t.title ILIKE '%invoice%' ESCAPE '\' ORDER BY t.created_at DESC, t.id ASC LIMIT 21;
RESET enable_indexscan;
\echo '=== D3. 少见词 + 排序:?q=urgent&sort=-createdAt —— 优化器选哪个?(对照讲义:统计目标调高之后,它不再选 GIN)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) :S WHERE t.title ILIKE '%urgent%' ESCAPE '\' ORDER BY t.created_at DESC, t.id ASC LIMIT 21;
