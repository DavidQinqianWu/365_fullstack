-- Day 31 · 01:准备数据(独立的 schema day31;重跑会整个删掉重建)
-- tasks 和 Day 29 / 30 一样(100 万行,setseed 保证每次相同)。
-- 今天一开始只有主键;每个实验文件自己建需要的索引,开头先把上一个实验的索引删掉,所以各文件可以单独重跑。
\timing on
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS day31 CASCADE;
CREATE SCHEMA day31;
SET search_path = day31;

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
\timing off
VACUUM ANALYZE tasks;    -- ANALYZE:收集统计信息;VACUUM:把 visibility map 建好(第 07 个文件专门讲)

SELECT relname AS 表或索引, pg_size_pretty(pg_relation_size(oid)) AS 大小
FROM pg_class WHERE relnamespace = 'day31'::regnamespace AND relkind IN ('r', 'i') ORDER BY relname;
