-- Day 34 · 03:offset 深分页 vs keyset —— 为什么 Day 19 选了 cursor(keyset)
-- nest-lab 对外只有 keyset;这里直接用 SQL 对比「翻到第 N 页」两种写法的代价。
-- 前提:npm run db:seed:big(schema app,30 万任务,有 (created_at, id) 索引)。
SET search_path = app;
SET client_min_messages = warning;
-- 按 created_at 升序、id 升序(行值比较也能用),每页 20 条
\echo '=== ① 第 1 页'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, title FROM tasks ORDER BY created_at, id LIMIT 20 OFFSET 0;
\echo '=== ② 第 10001 页:OFFSET 200000(要先数过 20 万行再扔掉)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, title FROM tasks ORDER BY created_at, id LIMIT 20 OFFSET 200000;
\echo '=== ③ 同一页:keyset(从书签直接开始)'
SELECT created_at AS bm_at, id AS bm_id FROM tasks ORDER BY created_at, id LIMIT 1 OFFSET 199999 \gset
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, title FROM tasks
WHERE (created_at, id) > (:'bm_at'::timestamptz, :bm_id) ORDER BY created_at, id LIMIT 20;
\echo '--- 两种写法拿到的是同一页吗'
SELECT (SELECT array_agg(id) FROM (SELECT id FROM tasks ORDER BY created_at, id LIMIT 20 OFFSET 200000) a)
     = (SELECT array_agg(id) FROM (SELECT id FROM tasks WHERE (created_at, id) > (:'bm_at'::timestamptz, :bm_id) ORDER BY created_at, id LIMIT 20) b)
       AS 相同;
