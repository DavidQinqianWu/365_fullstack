-- Day 33 · 06:GIN 的代价 —— 一行标题要拆成十几个三元组,每个都要进索引
-- 往一张新表里插 10 万个标题(从 tasks 里复制),分别在:没有索引 / B-tree / trigram GIN(默认 fastupdate = on)/ trigram GIN(fastupdate = off)下做。
-- fastupdate:新条目先塞进 GIN 的「待整理清单」(pending list),攒够了(gin_pending_list_limit,默认 4MB)或 VACUUM 时再批量并入正式索引;
--             插入快一些,但查询时要额外扫这张清单,而且「攒够了」的那一次插入会突然变慢。
-- 单次数字会抖,观察脚本每种情况各测 3 次。
SET search_path = day33, public;
SET client_min_messages = warning;
SHOW gin_pending_list_limit;
DROP TABLE IF EXISTS g;

\echo '=== 没有索引'
CREATE TABLE g (title text NOT NULL) WITH (autovacuum_enabled = false);
EXPLAIN (ANALYZE, WAL, COSTS OFF, TIMING OFF) INSERT INTO g SELECT title FROM tasks WHERE id <= 100000;
DROP TABLE g;

\echo '=== B-tree (title)'
CREATE TABLE g (title text NOT NULL) WITH (autovacuum_enabled = false);
CREATE INDEX g_btree ON g (title);
EXPLAIN (ANALYZE, WAL, COSTS OFF, TIMING OFF) INSERT INTO g SELECT title FROM tasks WHERE id <= 100000;
SELECT pg_size_pretty(pg_relation_size('g')) AS 表, pg_size_pretty(pg_relation_size('g_btree')) AS 索引;
DROP TABLE g;

\echo '=== trigram GIN,fastupdate = on(默认)'
CREATE TABLE g (title text NOT NULL) WITH (autovacuum_enabled = false);
CREATE INDEX g_trgm ON g USING gin (title gin_trgm_ops);
EXPLAIN (ANALYZE, WAL, COSTS OFF, TIMING OFF) INSERT INTO g SELECT title FROM tasks WHERE id <= 100000;
SELECT pg_size_pretty(pg_relation_size('g')) AS 表, pg_size_pretty(pg_relation_size('g_trgm')) AS 索引;
DROP TABLE g;

\echo '=== trigram GIN,fastupdate = off(每个条目直接写进正式索引)'
CREATE TABLE g (title text NOT NULL) WITH (autovacuum_enabled = false);
CREATE INDEX g_trgm ON g USING gin (title gin_trgm_ops) WITH (fastupdate = off);
EXPLAIN (ANALYZE, WAL, COSTS OFF, TIMING OFF) INSERT INTO g SELECT title FROM tasks WHERE id <= 100000;
SELECT pg_size_pretty(pg_relation_size('g')) AS 表, pg_size_pretty(pg_relation_size('g_trgm')) AS 索引;
DROP TABLE g;

\echo '=== 先插数据、后建索引(批量导入时的常见做法)'
CREATE TABLE g (title text NOT NULL) WITH (autovacuum_enabled = false);
INSERT INTO g SELECT title FROM tasks WHERE id <= 100000;
\timing on
CREATE INDEX g_trgm ON g USING gin (title gin_trgm_ops);
\timing off
SELECT pg_size_pretty(pg_relation_size('g_trgm')) AS 索引;
DROP TABLE g;
