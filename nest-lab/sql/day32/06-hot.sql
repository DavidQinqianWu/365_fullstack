-- Day 32 · 06:索引的代价(二)HOT 更新 —— 只改了没有任何卡片盒引用的栏目,卡片盒就不用动
-- HOT(Heap-Only Tuple):UPDATE 写新版本时,如果 ① 改的列不在任何索引里(键列、INCLUDE 列、部分索引的条件列都算)
-- 并且 ② 新版本能放进同一页,就不用给任何索引补条目。
-- 五张一样的表(10 万行,索引 (owner_id)、(created_at) 和主键),各更新 1 万行:
--   a 页填满(fillfactor 100),改 done      b 页留 10% 空位(fillfactor 90),改 done
--   c fillfactor 90,改 title(title 不在索引里)
--   d fillfactor 90,加索引 (title),改 title    e fillfactor 90,加覆盖索引 (owner_id) INCLUDE (title),改 title(回扣 Day 31)
SET search_path = day32;
SET client_min_messages = warning;
DROP TABLE IF EXISTS hot_a, hot_b, hot_c, hot_d, hot_e;
CREATE TABLE hot_a (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, owner_id bigint NOT NULL, title text NOT NULL, done boolean NOT NULL, created_at timestamptz NOT NULL)
  WITH (fillfactor = 100, autovacuum_enabled = false);
CREATE TABLE hot_b (LIKE hot_a INCLUDING ALL) WITH (fillfactor = 90, autovacuum_enabled = false);
CREATE TABLE hot_c (LIKE hot_a INCLUDING ALL) WITH (fillfactor = 90, autovacuum_enabled = false);
CREATE TABLE hot_d (LIKE hot_a INCLUDING ALL) WITH (fillfactor = 90, autovacuum_enabled = false);
CREATE TABLE hot_e (LIKE hot_a INCLUDING ALL) WITH (fillfactor = 90, autovacuum_enabled = false);
INSERT INTO hot_a (owner_id, title, done, created_at)
SELECT 1 + n % 10000, '任务 ' || n, n % 10 <> 0, timestamptz '2024-01-01 00:00+00' + n * interval '1 minute'
FROM generate_series(1, 100000) AS n;
INSERT INTO hot_b (owner_id, title, done, created_at) SELECT owner_id, title, done, created_at FROM hot_a ORDER BY id;
INSERT INTO hot_c (owner_id, title, done, created_at) SELECT owner_id, title, done, created_at FROM hot_a ORDER BY id;
INSERT INTO hot_d (owner_id, title, done, created_at) SELECT owner_id, title, done, created_at FROM hot_a ORDER BY id;
INSERT INTO hot_e (owner_id, title, done, created_at) SELECT owner_id, title, done, created_at FROM hot_a ORDER BY id;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['hot_a', 'hot_b', 'hot_c', 'hot_d', 'hot_e'] LOOP
    EXECUTE format('CREATE INDEX ON %I (owner_id); CREATE INDEX ON %I (created_at);', t, t);
  END LOOP;
END $$;
CREATE INDEX ON hot_d (title);
CREATE INDEX ON hot_e (owner_id) INCLUDE (title);
SELECT c.relname AS 表, c.reloptions AS 选项, pg_size_pretty(pg_table_size(c.oid)) AS 表大小,
       (SELECT string_agg(pg_get_indexdef(i.indexrelid), E'\n' ORDER BY i.indexrelid) FROM pg_index i WHERE i.indrelid = c.oid AND NOT i.indisprimary) AS 主键以外的索引
FROM pg_class c WHERE c.relnamespace = 'day32'::regnamespace AND c.relname LIKE 'hot\__' ORDER BY 1;

\echo '=== 各更新 1 万行(每 10 行改 1 行),看耗时和 WAL'
EXPLAIN (ANALYZE, WAL, COSTS OFF, TIMING OFF) UPDATE hot_a SET done = NOT done WHERE id % 10 = 0;
EXPLAIN (ANALYZE, WAL, COSTS OFF, TIMING OFF) UPDATE hot_b SET done = NOT done WHERE id % 10 = 0;
EXPLAIN (ANALYZE, WAL, COSTS OFF, TIMING OFF) UPDATE hot_c SET title = title || '(改)' WHERE id % 10 = 0;
EXPLAIN (ANALYZE, WAL, COSTS OFF, TIMING OFF) UPDATE hot_d SET title = title || '(改)' WHERE id % 10 = 0;
EXPLAIN (ANALYZE, WAL, COSTS OFF, TIMING OFF) UPDATE hot_e SET title = title || '(改)' WHERE id % 10 = 0;

-- 统计计数在会话结束时才写进共享的统计里,所以先重连一次(\c),再看 pg_stat_user_tables
\c
SET search_path = day32;
\echo '=== pg_stat_user_tables:n_tup_upd = 更新了几行,n_tup_hot_upd = 其中几次是 HOT'
SELECT relname AS 表, n_tup_upd AS 更新行数, n_tup_hot_upd AS 其中_hot,
       round(100.0 * n_tup_hot_upd / nullif(n_tup_upd, 0), 1) AS "HOT 占比 %"
FROM pg_stat_user_tables WHERE schemaname = 'day32' AND relname LIKE 'hot\__' ORDER BY relname;
DROP TABLE hot_a, hot_b, hot_c, hot_d, hot_e;
