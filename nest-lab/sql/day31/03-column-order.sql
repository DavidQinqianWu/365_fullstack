-- Day 31 · 03:列的顺序 —— 等值条件的列在前,范围 / 排序的列在后
-- 查询:1 号用户(约 10 万个任务)在 2025 年 6 月建的任务
-- 两个候选:(owner_id, created_at) vs (created_at, owner_id)。created_at 几乎每行都不同,「选择性」远比 owner_id 高
SET search_path = day31;
SET max_parallel_workers_per_gather = 0;
DROP INDEX IF EXISTS tasks_owner_created_idx;
DROP INDEX IF EXISTS tasks_created_owner_idx;

CREATE INDEX tasks_owner_created_idx ON tasks (owner_id, created_at);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT * FROM tasks WHERE owner_id = 1 AND created_at >= '2025-06-01' AND created_at < '2025-07-01';
DROP INDEX tasks_owner_created_idx;

CREATE INDEX tasks_created_owner_idx ON tasks (created_at, owner_id);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT * FROM tasks WHERE owner_id = 1 AND created_at >= '2025-06-01' AND created_at < '2025-07-01';
DROP INDEX tasks_created_owner_idx;
