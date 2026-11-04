-- Day 32 · 07:索引的代价(三)找出没用的索引、重复的索引
-- 先建 4 个索引,跑几条「业务查询」,再看数据库记下的每个索引被用了几次。
SET search_path = day32;
SET max_parallel_workers_per_gather = 0;
SET client_min_messages = warning;
DROP INDEX IF EXISTS tasks_owner_idx, tasks_owner_created_idx, tasks_title_idx, tasks_open_created_idx;
CREATE INDEX tasks_owner_idx         ON tasks (owner_id);                       -- 外键列的索引(第 04 个文件)
CREATE INDEX tasks_owner_created_idx ON tasks (owner_id, created_at DESC);      -- 「某人最新的任务」(Day 31)
CREATE INDEX tasks_title_idx         ON tasks (title);                          -- 「以后可能按标题查」……
CREATE INDEX tasks_open_created_idx  ON tasks (created_at) WHERE done = false;  -- 第 02 个文件的部分索引
ANALYZE tasks;

\echo '=== ① 表和索引一共多大'
SELECT pg_size_pretty(pg_table_size('tasks'))   AS 表本身,
       pg_size_pretty(pg_indexes_size('tasks')) AS 所有索引加起来,
       pg_size_pretty(pg_total_relation_size('tasks')) AS 合计;

\echo '=== ② 跑几条「业务查询」(输出丢掉,只为了让统计计数)'
SELECT * FROM tasks WHERE owner_id = 2 ORDER BY created_at DESC LIMIT 20 \g /dev/null
SELECT * FROM tasks WHERE owner_id = 3 ORDER BY created_at DESC LIMIT 20 \g /dev/null
SELECT * FROM tasks WHERE done = false ORDER BY created_at DESC LIMIT 20 \g /dev/null
SELECT count(*) FROM tasks WHERE owner_id = 5000 \g /dev/null
BEGIN;
DELETE FROM users WHERE id = 50000;      -- 外键检查会去 tasks 里找 owner_id = 50000
ROLLBACK;

-- 统计计数在会话结束时才写进共享的统计里:重连一次再看
\c
SET search_path = day32;
\echo '=== ③ pg_stat_user_indexes:每个索引被扫描了几次'
SELECT s.relname AS 表, s.indexrelname AS 索引, s.idx_scan AS 被扫描次数, s.last_idx_scan IS NOT NULL AS 最近用过,
       pg_size_pretty(pg_relation_size(s.indexrelid)) AS 大小,
       CASE WHEN i.indisprimary THEN '主键' WHEN i.indisunique THEN '唯一' ELSE '' END AS 约束
FROM pg_stat_user_indexes s JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.schemaname = 'day32'
ORDER BY s.relname, s.idx_scan, s.indexrelname;

\echo '=== ④ 工具:「从没被用过、又不是主键 / 唯一约束」的索引(删之前还要看统计从什么时候开始算)'
SELECT s.schemaname || '.' || s.relname AS 表, s.indexrelname AS 索引,
       pg_size_pretty(pg_relation_size(s.indexrelid)) AS 白占的空间
FROM pg_stat_user_indexes s JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.idx_scan = 0 AND NOT i.indisunique AND NOT i.indisprimary
  AND s.schemaname = 'day32'                      -- 去掉这一行就查整个库
ORDER BY pg_relation_size(s.indexrelid) DESC;
SELECT stats_reset AS "本库统计上次重置的时间(空 = 从没重置过)" FROM pg_stat_database WHERE datname = current_database();
\echo '--- 普通用户不能随手重置统计(默认只有超级用户能执行)'
SELECT pg_stat_reset_single_table_counters('tasks'::regclass);

\echo '=== ⑤ 工具:重复的索引 —— A 的键列正好是 B 键列的前缀(同样的列、同样的操作符类),A 往往可以删'
SELECT a.indrelid::regclass AS 表, a.indexrelid::regclass AS 可能多余, b.indexrelid::regclass AS 被它覆盖,
       pg_size_pretty(pg_relation_size(a.indexrelid)) AS 可省的空间
FROM pg_index a
JOIN pg_index b ON b.indrelid = a.indrelid AND b.indexrelid <> a.indexrelid
WHERE a.indrelid::regclass::text IN ('tasks', 'users')     -- 换成你的表,或去掉
  AND NOT a.indisunique                                    -- 唯一索引在保证约束,不能当「多余」删
  AND a.indpred IS NULL AND b.indpred IS NULL              -- 部分索引另算
  AND a.indexprs IS NULL AND b.indexprs IS NULL            -- 表达式索引另算
  AND a.indnkeyatts <= b.indnkeyatts
  AND (a.indkey::int2[])[0:a.indnkeyatts - 1] = (b.indkey::int2[])[0:a.indnkeyatts - 1]
  AND (a.indclass::oid[])[0:a.indnkeyatts - 1] = (b.indclass::oid[])[0:a.indnkeyatts - 1]
ORDER BY 1, 2;

DROP INDEX tasks_owner_idx, tasks_owner_created_idx, tasks_title_idx, tasks_open_created_idx;
