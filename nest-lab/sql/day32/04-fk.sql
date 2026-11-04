-- Day 32 · 04:外键列不会自动建索引 —— 注销一个会员,要翻遍整本订单本找他的订单
-- tasks.owner_id → users.id,ON DELETE CASCADE(删会员时级联删掉他的任务)。
-- PostgreSQL 会自动给主键、唯一约束建索引,但【不会】给外键列(引用别人的那一列)建索引。
SET search_path = day32;
SET max_parallel_workers_per_gather = 0;
SET client_min_messages = warning;
DROP INDEX IF EXISTS tasks_owner_id_idx, users_email_lower_key;

\echo '=== ① 工具:找出「没有索引打头的外键列」(复制这段到任何库都能用)'
-- 外键的列(conkey)必须是某个索引最前面的那几列(顺序可以不同),否则删 / 改父表的行时,子表只能全表扫描
SELECT c.conrelid::regclass AS 子表,
       c.conname           AS 外键约束,
       pg_get_constraintdef(c.oid) AS 定义,
       pg_size_pretty(pg_relation_size(c.conrelid)) AS 子表大小
FROM pg_constraint c
WHERE c.contype = 'f'
  AND c.connamespace = 'day32'::regnamespace      -- 去掉这一行就查整个库
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid
      AND i.indpred IS NULL                                   -- 部分索引不算(它不收所有行)
      AND (i.indkey::int2[])[0:cardinality(c.conkey) - 1] @> c.conkey   -- indkey 从下标 0 开始
      AND (i.indkey::int2[])[0:cardinality(c.conkey) - 1] <@ c.conkey
  )
ORDER BY 1, 2;

\echo '=== ② 没有索引:注销 50000 号会员(他一个任务都没有)'
BEGIN;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) DELETE FROM users WHERE id = 50000;
ROLLBACK;     -- 只为看计划,不真的删
\echo '=== ③ 没有索引:一次注销 10 个没有任务的会员(50001–50010)'
BEGIN;
EXPLAIN (ANALYZE, COSTS OFF) DELETE FROM users WHERE id BETWEEN 50001 AND 50010;
ROLLBACK;
\echo '=== ④ 没有索引:注销 5000 号会员(他有几十个任务,会被级联删除)'
BEGIN;
EXPLAIN (ANALYZE, COSTS OFF) DELETE FROM users WHERE id = 5000;
ROLLBACK;

\echo '=== ⑤ 给外键列建索引,再做一遍'
CREATE INDEX tasks_owner_id_idx ON tasks (owner_id);
BEGIN;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) DELETE FROM users WHERE id = 50000;
ROLLBACK;
BEGIN;
EXPLAIN (ANALYZE, COSTS OFF) DELETE FROM users WHERE id BETWEEN 50001 AND 50010;
ROLLBACK;
BEGIN;
EXPLAIN (ANALYZE, COSTS OFF) DELETE FROM users WHERE id = 5000;
ROLLBACK;
\echo '--- 现在工具查询应该什么都查不出来'
SELECT c.conrelid::regclass AS 子表, c.conname AS 外键约束
FROM pg_constraint c
WHERE c.contype = 'f' AND c.connamespace = 'day32'::regnamespace
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND i.indpred IS NULL
      AND (i.indkey::int2[])[0:cardinality(c.conkey) - 1] @> c.conkey
      AND (i.indkey::int2[])[0:cardinality(c.conkey) - 1] <@ c.conkey
  );

\echo '=== ⑥ JOIN:按邮箱找会员,再数他的未完成任务'
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
ANALYZE users;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT u.id, count(*) FILTER (WHERE NOT t.done) AS 未完成
FROM users u JOIN tasks t ON t.owner_id = u.id
WHERE lower(u.email) = 'user5000@example.com'
GROUP BY u.id;
DROP INDEX tasks_owner_id_idx;
\echo '--- 去掉外键列的索引,同一个查询'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT u.id, count(*) FILTER (WHERE NOT t.done) AS 未完成
FROM users u JOIN tasks t ON t.owner_id = u.id
WHERE lower(u.email) = 'user5000@example.com'
GROUP BY u.id;
DROP INDEX users_email_lower_key;

\echo '=== ⑦ nest-lab 自己的库(schema app):checklist_items.task_id 是外键,有没有索引?'
SELECT c.conrelid::regclass AS 子表, c.conname AS 外键约束, pg_get_constraintdef(c.oid) AS 定义,
       (SELECT string_agg(i.indexrelid::regclass::text, ', ') FROM pg_index i
        WHERE i.indrelid = c.conrelid AND i.indpred IS NULL
          AND (i.indkey::int2[])[0:cardinality(c.conkey) - 1] @> c.conkey
          AND (i.indkey::int2[])[0:cardinality(c.conkey) - 1] <@ c.conkey) AS "打头能用的索引"
FROM pg_constraint c
WHERE c.contype = 'f' AND c.connamespace::regnamespace::text IN ('app', 'app_test')
ORDER BY 1;
