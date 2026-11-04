-- Day 33 · 07:BRIN(块范围索引)—— 每个书架贴一张「这架上的日期从 X 到 Y」的标签
-- BRIN 不记每一行,只给每一段连续的数据页(默认 128 页一段)记一个「最小值 ~ 最大值」。
-- 数据按时间顺序追加时,每一段的范围都很窄,查某一天只需要看少数几段;数据顺序乱了,每一段的范围都很宽,就全都得看。
SET search_path = day33, public;
SET max_parallel_workers_per_gather = 0;
SET client_min_messages = warning;
DROP INDEX IF EXISTS tasks_created_btree, tasks_created_brin, tasks_created_brin16;
DROP TABLE IF EXISTS tasks_shuffled;

\echo '=== ① created_at 的物理顺序和值的顺序有多一致(correlation:1 = 完全一致,0 = 毫无关系)'
SELECT attname AS 列, round(correlation::numeric, 4) AS correlation FROM pg_stats
WHERE schemaname = 'day33' AND tablename = 'tasks' AND attname IN ('created_at', 'owner_id') ORDER BY 1;

\echo '=== ② 大小:B-tree vs BRIN(默认 128 页一段)vs BRIN(16 页一段)'
CREATE INDEX tasks_created_btree  ON tasks (created_at);
CREATE INDEX tasks_created_brin   ON tasks USING brin (created_at);
CREATE INDEX tasks_created_brin16 ON tasks USING brin (created_at) WITH (pages_per_range = 16);
SELECT indexrelid::regclass AS 索引, pg_size_pretty(pg_relation_size(indexrelid)) AS 大小
FROM pg_index WHERE indrelid = 'tasks'::regclass AND indexrelid::regclass::text LIKE 'tasks_created_%' ORDER BY pg_relation_size(indexrelid) DESC;
SELECT pg_size_pretty(pg_relation_size('tasks')) AS 表, pg_relation_size('tasks') / 8192 AS 表的页数;

\echo '=== ③ 查某一天(1440 行)'
DROP INDEX tasks_created_brin16;
\echo '--- B-tree'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT count(*), max(title) FROM tasks
WHERE created_at >= '2025-06-01 00:00+00' AND created_at < '2025-06-02 00:00+00';
DROP INDEX tasks_created_btree;
\echo '--- BRIN'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT count(*), max(title) FROM tasks
WHERE created_at >= '2025-06-01 00:00+00' AND created_at < '2025-06-02 00:00+00';

\echo '=== ④ 同样的数据,打乱物理顺序'
SELECT setseed(0.33);
CREATE TABLE tasks_shuffled AS SELECT id, title, created_at FROM tasks ORDER BY random();
CREATE INDEX tasks_shuffled_created_brin ON tasks_shuffled USING brin (created_at);
VACUUM ANALYZE tasks_shuffled;
SELECT round(correlation::numeric, 4) AS "打乱后的 correlation" FROM pg_stats
WHERE schemaname = 'day33' AND tablename = 'tasks_shuffled' AND attname = 'created_at';
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT count(*), max(title) FROM tasks_shuffled
WHERE created_at >= '2025-06-01 00:00+00' AND created_at < '2025-06-02 00:00+00';
\echo '--- 强行用 BRIN(enable_seqscan = off,只为学习)'
SET enable_seqscan = off;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT count(*), max(title) FROM tasks_shuffled
WHERE created_at >= '2025-06-01 00:00+00' AND created_at < '2025-06-02 00:00+00';
RESET enable_seqscan;

DROP TABLE tasks_shuffled;
DROP INDEX tasks_created_brin;
