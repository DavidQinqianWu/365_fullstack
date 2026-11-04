-- Day 31 · 07:覆盖索引(INCLUDE)与 Index Only Scan;visibility map 与 VACUUM
-- 查询:列表页只要 id、title、done ——「2 号用户最新的 20 个任务」
SET search_path = day31;
SET max_parallel_workers_per_gather = 0;
DROP INDEX IF EXISTS tasks_owner_created_id_idx;
DROP INDEX IF EXISTS tasks_owner_created_id_cov_idx;

-- 普通复合索引:索引里没有 title、done,每一行都要回表取
CREATE INDEX tasks_owner_created_id_idx ON tasks (owner_id, created_at DESC, id DESC);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT id, title, done FROM tasks WHERE owner_id = 2 ORDER BY created_at DESC, id DESC LIMIT 20;
-- 覆盖索引:INCLUDE 把 title、done 顺手抄进索引的叶子里(不参与排序和查找)
CREATE INDEX tasks_owner_created_id_cov_idx ON tasks (owner_id, created_at DESC, id DESC) INCLUDE (title, done);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT id, title, done FROM tasks WHERE owner_id = 2 ORDER BY created_at DESC, id DESC LIMIT 20;
SELECT relname AS 索引, pg_size_pretty(pg_relation_size(oid)) AS 大小
FROM pg_class WHERE oid IN ('tasks_owner_created_id_idx'::regclass, 'tasks_owner_created_id_cov_idx'::regclass) ORDER BY relname;

-- 统计 2 号用户的未完成任务数:Index Only Scan 要扫 2 号的全部 1.9 万个条目
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT count(*) FROM tasks WHERE owner_id = 2 AND NOT done;
-- 把 2 号用户的每一行都更新一次(值不变,但 PostgreSQL 会写新版本 —— Day 29 的 ctid 变化)
UPDATE tasks SET title = title WHERE owner_id = 2;
-- 那些页的「全部可见」标记被清掉了:Index Only Scan 只好回表核对
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT count(*) FROM tasks WHERE owner_id = 2 AND NOT done;
-- VACUUM 清理旧版本,并把页重新标记为「全部可见」
VACUUM tasks;
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT count(*) FROM tasks WHERE owner_id = 2 AND NOT done;
SELECT relpages AS 表的页数, relallvisible AS 其中全部可见的页数 FROM pg_class WHERE oid = 'tasks'::regclass;

DROP INDEX tasks_owner_created_id_idx;
DROP INDEX tasks_owner_created_id_cov_idx;
