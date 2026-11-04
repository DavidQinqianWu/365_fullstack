-- Day 32 · 05:索引的代价(一)写放大 —— 每记一笔账,所有卡片盒都要同步补一张卡
-- 同一批 20 万行的 INSERT,再把这 20 万行都 UPDATE 一次,分别在 0、1、3、6 个索引下做:
--   耗时:clock_timestamp() 前后差(含一次往返,本机不到 1 ms)
--   WAL 量:pg_current_wal_lsn() 前后差(WAL = 预写日志,每个改动先写进它;复制、备份都靠它,Week 7 / 8 再讲)
-- 每种情况都用一张全新的表 w(新表的新页不会产生「整页镜像」,数字更好比);关掉 autovacuum,免得它中途插进来。
-- w 没有主键,所以「0 个索引」就是真的一个都没有。
-- 单次数字会抖,观察脚本(npm run day32)每种情况各测 3 次。
SET search_path = day32;
SET client_min_messages = warning;
DROP TABLE IF EXISTS write_cost;
CREATE TABLE write_cost (索引数 int, insert_ms numeric, insert_wal bigint, update_ms numeric, update_wal bigint, 其中_hot int, 索引总大小 bigint);

\echo '=== 0 个索引'
DROP TABLE IF EXISTS w;
CREATE TABLE w (id bigint GENERATED ALWAYS AS IDENTITY, owner_id bigint NOT NULL, title text NOT NULL, done boolean NOT NULL, created_at timestamptz NOT NULL)
  WITH (autovacuum_enabled = false);
SELECT pg_current_wal_lsn() AS l0, clock_timestamp() AS t0 \gset
INSERT INTO w (owner_id, title, done, created_at)
SELECT 1 + n % 10000, '任务 ' || n, n % 10 <> 0, timestamptz '2024-01-01 00:00+00' + n * interval '1 minute'
FROM generate_series(1, 200000) AS n;
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), :'l0') AS insert_wal,
       round(extract(epoch FROM clock_timestamp() - :'t0'::timestamptz) * 1000, 1) AS insert_ms \gset
BEGIN;
SELECT pg_current_wal_lsn() AS l0, clock_timestamp() AS t0 \gset
UPDATE w SET done = NOT done;            -- 改的 done 不在任何索引里
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), :'l0') AS update_wal,
       round(extract(epoch FROM clock_timestamp() - :'t0'::timestamptz) * 1000, 1) AS update_ms,
       n_tup_hot_upd AS hot FROM pg_stat_xact_user_tables WHERE relid = 'w'::regclass \gset
COMMIT;
INSERT INTO write_cost VALUES (0, :insert_ms, :insert_wal, :update_ms, :update_wal, :hot, pg_indexes_size('w'));

\echo '=== 1 个索引'
DROP TABLE IF EXISTS w;
CREATE TABLE w (id bigint GENERATED ALWAYS AS IDENTITY, owner_id bigint NOT NULL, title text NOT NULL, done boolean NOT NULL, created_at timestamptz NOT NULL)
  WITH (autovacuum_enabled = false);
CREATE INDEX ON w (owner_id);
SELECT pg_current_wal_lsn() AS l0, clock_timestamp() AS t0 \gset
INSERT INTO w (owner_id, title, done, created_at)
SELECT 1 + n % 10000, '任务 ' || n, n % 10 <> 0, timestamptz '2024-01-01 00:00+00' + n * interval '1 minute'
FROM generate_series(1, 200000) AS n;
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), :'l0') AS insert_wal,
       round(extract(epoch FROM clock_timestamp() - :'t0'::timestamptz) * 1000, 1) AS insert_ms \gset
BEGIN;
SELECT pg_current_wal_lsn() AS l0, clock_timestamp() AS t0 \gset
UPDATE w SET done = NOT done;            -- 改的 done 不在任何索引里
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), :'l0') AS update_wal,
       round(extract(epoch FROM clock_timestamp() - :'t0'::timestamptz) * 1000, 1) AS update_ms,
       n_tup_hot_upd AS hot FROM pg_stat_xact_user_tables WHERE relid = 'w'::regclass \gset
COMMIT;
INSERT INTO write_cost VALUES (1, :insert_ms, :insert_wal, :update_ms, :update_wal, :hot, pg_indexes_size('w'));

\echo '=== 3 个索引'
DROP TABLE IF EXISTS w;
CREATE TABLE w (id bigint GENERATED ALWAYS AS IDENTITY, owner_id bigint NOT NULL, title text NOT NULL, done boolean NOT NULL, created_at timestamptz NOT NULL)
  WITH (autovacuum_enabled = false);
CREATE INDEX ON w (owner_id);
CREATE INDEX ON w (created_at);
CREATE INDEX ON w (title);
SELECT pg_current_wal_lsn() AS l0, clock_timestamp() AS t0 \gset
INSERT INTO w (owner_id, title, done, created_at)
SELECT 1 + n % 10000, '任务 ' || n, n % 10 <> 0, timestamptz '2024-01-01 00:00+00' + n * interval '1 minute'
FROM generate_series(1, 200000) AS n;
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), :'l0') AS insert_wal,
       round(extract(epoch FROM clock_timestamp() - :'t0'::timestamptz) * 1000, 1) AS insert_ms \gset
BEGIN;
SELECT pg_current_wal_lsn() AS l0, clock_timestamp() AS t0 \gset
UPDATE w SET done = NOT done;            -- 改的 done 不在任何索引里
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), :'l0') AS update_wal,
       round(extract(epoch FROM clock_timestamp() - :'t0'::timestamptz) * 1000, 1) AS update_ms,
       n_tup_hot_upd AS hot FROM pg_stat_xact_user_tables WHERE relid = 'w'::regclass \gset
COMMIT;
INSERT INTO write_cost VALUES (3, :insert_ms, :insert_wal, :update_ms, :update_wal, :hot, pg_indexes_size('w'));

\echo '=== 6 个索引'
DROP TABLE IF EXISTS w;
CREATE TABLE w (id bigint GENERATED ALWAYS AS IDENTITY, owner_id bigint NOT NULL, title text NOT NULL, done boolean NOT NULL, created_at timestamptz NOT NULL)
  WITH (autovacuum_enabled = false);
CREATE INDEX ON w (owner_id);
CREATE INDEX ON w (created_at);
CREATE INDEX ON w (title);
CREATE INDEX ON w (owner_id, created_at DESC, id DESC);
CREATE INDEX ON w (lower(title));
CREATE INDEX ON w (title, created_at);
SELECT pg_current_wal_lsn() AS l0, clock_timestamp() AS t0 \gset
INSERT INTO w (owner_id, title, done, created_at)
SELECT 1 + n % 10000, '任务 ' || n, n % 10 <> 0, timestamptz '2024-01-01 00:00+00' + n * interval '1 minute'
FROM generate_series(1, 200000) AS n;
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), :'l0') AS insert_wal,
       round(extract(epoch FROM clock_timestamp() - :'t0'::timestamptz) * 1000, 1) AS insert_ms \gset
BEGIN;
SELECT pg_current_wal_lsn() AS l0, clock_timestamp() AS t0 \gset
UPDATE w SET done = NOT done;            -- 改的 done 不在任何索引里
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), :'l0') AS update_wal,
       round(extract(epoch FROM clock_timestamp() - :'t0'::timestamptz) * 1000, 1) AS update_ms,
       n_tup_hot_upd AS hot FROM pg_stat_xact_user_tables WHERE relid = 'w'::regclass \gset
COMMIT;
INSERT INTO write_cost VALUES (6, :insert_ms, :insert_wal, :update_ms, :update_wal, :hot, pg_indexes_size('w'));

SELECT 索引数, insert_ms AS "INSERT 耗时 ms", pg_size_pretty(insert_wal) AS "INSERT 的 WAL",
       update_ms AS "UPDATE 耗时 ms", pg_size_pretty(update_wal) AS "UPDATE 的 WAL", 其中_hot AS "20 万次更新里 HOT 的",
       pg_size_pretty(索引总大小) AS "索引总大小"
FROM write_cost ORDER BY 1;
SELECT pg_size_pretty(pg_table_size('w')) AS "表本身(6 个索引那次)";
DROP TABLE w, write_cost;
