-- Day 31 · 05:一个索引同时服务 WHERE + ORDER BY + LIMIT ——「2 号用户最新的 20 个任务」
SET search_path = day31;
SET max_parallel_workers_per_gather = 0;
DROP INDEX IF EXISTS tasks_owner_idx;
DROP INDEX IF EXISTS tasks_owner_created_id_idx;
DROP INDEX IF EXISTS tasks_owner_created_desc_id_asc_idx;

-- 只有 owner_id 单列索引:先把 2 号的 1.9 万行都取出来,再排序取前 20
CREATE INDEX tasks_owner_idx ON tasks (owner_id);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT * FROM tasks WHERE owner_id = 2 ORDER BY created_at DESC, id DESC LIMIT 20;
DROP INDEX tasks_owner_idx;

-- 复合索引 (owner_id, created_at DESC, id DESC):索引里 2 号那一段本来就按「最新在前」排好了,读 20 个就停
CREATE INDEX tasks_owner_created_id_idx ON tasks (owner_id, created_at DESC, id DESC);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT * FROM tasks WHERE owner_id = 2 ORDER BY created_at DESC, id DESC LIMIT 20;
-- 方向全部反过来:倒着读同一个索引
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT * FROM tasks WHERE owner_id = 2 ORDER BY created_at ASC, id ASC LIMIT 20;
-- 方向混合(created_at 降序、id 升序):索引只能帮一半,剩下的要再排一次(Incremental Sort)
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT * FROM tasks WHERE owner_id = 2 ORDER BY created_at DESC, id ASC LIMIT 20;
DROP INDEX tasks_owner_created_id_idx;
-- 索引里就按混合方向声明
CREATE INDEX tasks_owner_created_desc_id_asc_idx ON tasks (owner_id, created_at DESC, id ASC);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT * FROM tasks WHERE owner_id = 2 ORDER BY created_at DESC, id ASC LIMIT 20;
DROP INDEX tasks_owner_created_desc_id_asc_idx;
