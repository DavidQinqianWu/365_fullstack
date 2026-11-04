-- Day 30 · 03:BUFFERS —— 哪些页已经在缓存里(shared hit),哪些要去读(read)
-- tasks_cold 是刚复制出来的一份,索引也是刚建的:它们的页还没进 PostgreSQL 的共享缓存(shared_buffers)
SET search_path = day30;
SET max_parallel_workers_per_gather = 0;
SET client_min_messages = warning;
DROP TABLE IF EXISTS tasks_cold;
CREATE TABLE tasks_cold AS SELECT * FROM tasks;
CREATE INDEX tasks_cold_id_idx ON tasks_cold (id);
ANALYZE tasks_cold;
SHOW shared_buffers;

-- 按 id 找一行:第一次 / 第二次
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM tasks_cold WHERE id = 777777;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM tasks_cold WHERE id = 777777;

-- 全表扫描一张 65 MB 的表:第一次 / 第二次(注意第二次还在 read)
EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM tasks_cold;
EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM tasks_cold;
