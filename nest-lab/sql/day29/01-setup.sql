-- Day 29 · 01:造一张一百万行的 tasks 表(独立的 schema day29;重跑会整个删掉重建)
-- 字段贴近 nest-lab 的 tasks(多了设计稿里的 owner_id)。故意先不建任何索引,连主键都没有。
-- 数据分布尽量像真的:
--   · owner_id:1–10000,少数人任务特别多(1 号最多),大多数人只有几十个
--   · done:大约 90% 已完成
--   · created_at:从 2024-01-01 起大致按时间递增
-- setseed 让每次生成的「随机」数据都一样,方便对照讲义
\timing on
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS day29 CASCADE;
CREATE SCHEMA day29;
SET search_path = day29;

CREATE TABLE tasks (
  id         bigint GENERATED ALWAYS AS IDENTITY,   -- 注意:今天先不加 PRIMARY KEY
  owner_id   bigint NOT NULL,
  title      text NOT NULL,
  done       boolean NOT NULL,
  created_at timestamptz NOT NULL
);

SELECT setseed(0.29);
INSERT INTO tasks (owner_id, title, done, created_at)
SELECT 1 + floor(9999 * power(random(), 4))::bigint,           -- 4 次方:数字越小的 owner 越常见
       '任务 ' || n,
       random() < 0.9,
       timestamptz '2024-01-01 00:00+00' + n * interval '1 minute' + random() * interval '30 seconds'
FROM generate_series(1, 1000000) AS n;
\timing off

ANALYZE tasks;   -- 让优化器知道这张表有多大、数据怎么分布(Day 30 细讲)

SELECT count(*) AS 行数, pg_size_pretty(pg_relation_size('tasks')) AS 表的大小 FROM tasks;
SELECT round(100.0 * count(*) FILTER (WHERE done) / count(*), 1) AS 已完成占比 FROM tasks;
SELECT owner_id, count(*) AS 任务数 FROM tasks GROUP BY owner_id ORDER BY count(*) DESC LIMIT 3;
SELECT min(c) AS 最少, percentile_cont(0.5) WITHIN GROUP (ORDER BY c) AS 中位数, max(c) AS 最多
FROM (SELECT count(*) AS c FROM tasks GROUP BY owner_id) x;   -- 每个 owner 有几个任务
