-- Day 31 · 02:复合索引与最左前缀 —— 索引 (owner_id, created_at) 先按 owner_id 排,owner_id 相同的再按 created_at 排
SET search_path = day31;
SET max_parallel_workers_per_gather = 0;   -- 关掉并行,让计划好读(只为学习)
DROP INDEX IF EXISTS tasks_owner_created_idx;
CREATE INDEX tasks_owner_created_idx ON tasks (owner_id, created_at);

-- ① 只用第一列
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT * FROM tasks WHERE owner_id = 5000;
-- ② 第一列等值 + 第二列范围:两个条件都进了 Index Cond
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT * FROM tasks WHERE owner_id = 5000 AND created_at >= '2025-01-01';
-- ③ 第一列等值 + 按第二列排序取前 20:没有 Sort 节点,倒着读索引
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT * FROM tasks WHERE owner_id = 5000 ORDER BY created_at DESC LIMIT 20;
-- ④ 只有第二列:优化器不用这个索引
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT * FROM tasks WHERE created_at >= '2025-06-01' AND created_at < '2025-06-02';
-- ④ 再看一次:强行用索引(只为学习)—— 只能把整个索引从头读到尾
SET enable_seqscan = off;
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT * FROM tasks WHERE created_at >= '2025-06-01' AND created_at < '2025-06-02';
RESET enable_seqscan;
SELECT pg_relation_size('tasks_owner_created_idx') / 8192 AS 这个索引一共几页;

DROP INDEX tasks_owner_created_idx;
