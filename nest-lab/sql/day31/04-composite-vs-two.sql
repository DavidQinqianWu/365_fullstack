-- Day 31 · 04:一个复合索引 vs 两个单列索引
-- 查询:2 号用户(约 1.9 万个任务)里还没完成的
SET search_path = day31;
SET max_parallel_workers_per_gather = 0;
DROP INDEX IF EXISTS tasks_owner_idx;
DROP INDEX IF EXISTS tasks_done_idx;
DROP INDEX IF EXISTS tasks_owner_done_idx;

-- 两个单列索引:各自查出一张位图,再「按位与」(BitmapAnd)
CREATE INDEX tasks_owner_idx ON tasks (owner_id);
CREATE INDEX tasks_done_idx ON tasks (done);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT * FROM tasks WHERE owner_id = 2 AND NOT done;

-- 加一个复合索引:一次就定位到「2 号 + 未完成」那一段
CREATE INDEX tasks_owner_done_idx ON tasks (owner_id, done);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT * FROM tasks WHERE owner_id = 2 AND NOT done;

DROP INDEX tasks_owner_idx;
DROP INDEX tasks_done_idx;
DROP INDEX tasks_owner_done_idx;
