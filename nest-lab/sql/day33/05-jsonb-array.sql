-- Day 33 · 05:JSONB 与数组的 GIN(回扣 Day 26)—— 一行里有好几个值,每个值都进「关键词索引」
SET search_path = day33, public;
SET max_parallel_workers_per_gather = 0;
SET client_min_messages = warning;
DROP INDEX IF EXISTS tasks_tags_idx, tasks_meta_idx, tasks_meta_path_idx, tasks_meta_source_idx;

\echo '=== ① 数组:带 security 标签的任务(约 0.3%)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, tags FROM tasks WHERE tags @> ARRAY['security'];
CREATE INDEX tasks_tags_idx ON tasks USING gin (tags);
ANALYZE tasks;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, tags FROM tasks WHERE tags @> ARRAY['security'];
\echo '--- && 是「有交集」:带 security 或 docs 的'
EXPLAIN (COSTS OFF) SELECT id, tags FROM tasks WHERE tags && ARRAY['security', 'docs'];
SELECT pg_size_pretty(pg_relation_size('tasks_tags_idx')) AS "tags 的 GIN";
DROP INDEX tasks_tags_idx;

\echo '=== ② JSONB:两种 GIN 操作符类'
CREATE INDEX tasks_meta_idx      ON tasks USING gin (meta);                  -- 默认 jsonb_ops:每个键、每个值都单独进索引
CREATE INDEX tasks_meta_path_idx ON tasks USING gin (meta jsonb_path_ops);   -- jsonb_path_ops:只存「路径 + 值」的哈希
ANALYZE tasks;
SELECT indexrelid::regclass AS 索引, pg_size_pretty(pg_relation_size(indexrelid)) AS 大小
FROM pg_index WHERE indexrelid IN ('tasks_meta_idx'::regclass, 'tasks_meta_path_idx'::regclass) ORDER BY 1;
\echo '--- 两种操作符类各支持哪些操作符'
SELECT opc.opcname AS 操作符类, string_agg(DISTINCT o.oprname, '  ' ORDER BY o.oprname) AS 支持的操作符
FROM pg_opclass opc
JOIN pg_amop ao ON ao.amopfamily = opc.opcfamily
JOIN pg_operator o ON o.oid = ao.amopopr
WHERE opc.opcname IN ('jsonb_ops', 'jsonb_path_ops') AND opc.opcmethod = (SELECT oid FROM pg_am WHERE amname = 'gin')
GROUP BY opc.opcname ORDER BY 1;

\echo '--- @> 包含(来源 api、优先级 high):两个索引都能用,只留 jsonb_path_ops 看看'
DROP INDEX tasks_meta_idx;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT count(*) FROM tasks WHERE meta @> '{"source": "api", "priority": "high"}';
\echo '--- ? 有没有某个键(有 due 的,约 1%):jsonb_path_ops 不支持'
EXPLAIN (COSTS OFF) SELECT count(*) FROM tasks WHERE meta ? 'due';
\echo '--- 换回 jsonb_ops'
DROP INDEX tasks_meta_path_idx;
CREATE INDEX tasks_meta_idx ON tasks USING gin (meta);
ANALYZE tasks;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT count(*) FROM tasks WHERE meta ? 'due';
\echo '--- 但 meta->>''source'' = ''api'' 这种写法,GIN 两种都帮不上(要么改写成 @>,要么建 B-tree 表达式索引)'
EXPLAIN (COSTS OFF) SELECT count(*) FROM tasks WHERE meta->>'source' = 'api';
DROP INDEX tasks_meta_idx;
