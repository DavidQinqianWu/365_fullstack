-- Day 30 · 01:准备数据(独立的 schema day30;重跑会整个删掉重建)
-- tasks 和 Day 29 一样(100 万行,setseed 保证每次相同),再加一张 users(1 万人)用来做 JOIN。
-- 今天的索引:tasks 主键、tasks.owner_id、users 主键。
\timing on
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS day30 CASCADE;
CREATE SCHEMA day30;
SET search_path = day30;

CREATE TABLE users (
  id   bigint PRIMARY KEY,
  name text NOT NULL,
  plan text NOT NULL            -- 'free' / 'pro':只有 1/10 的人是付费用户
);
INSERT INTO users SELECT n, '用户 ' || n, CASE WHEN n % 10 = 0 THEN 'pro' ELSE 'free' END FROM generate_series(1, 10000) n;

CREATE TABLE tasks (
  id         bigint GENERATED ALWAYS AS IDENTITY,
  owner_id   bigint NOT NULL,
  title      text NOT NULL,
  done       boolean NOT NULL,
  created_at timestamptz NOT NULL
);
SELECT setseed(0.29);
INSERT INTO tasks (owner_id, title, done, created_at)
SELECT 1 + floor(9999 * power(random(), 4))::bigint,
       '任务 ' || n,
       random() < 0.9,
       timestamptz '2024-01-01 00:00+00' + n * interval '1 minute' + random() * interval '30 seconds'
FROM generate_series(1, 1000000) AS n;
ALTER TABLE tasks ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);
CREATE INDEX tasks_owner_id_idx ON tasks (owner_id);
\timing off
VACUUM ANALYZE users;
VACUUM ANALYZE tasks;    -- ANALYZE:收集统计信息;VACUUM:顺便把 visibility map 建好(Index Only Scan 要用,Day 31)

SELECT relname AS 表或索引, pg_size_pretty(pg_relation_size(oid)) AS 大小
FROM pg_class WHERE relnamespace = 'day30'::regnamespace AND relkind IN ('r', 'i') ORDER BY relname;
