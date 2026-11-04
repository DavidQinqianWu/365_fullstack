-- Day 32 · 01:准备数据(独立的 schema day32;重跑会整个删掉重建)
-- users:10 万个会员,邮箱大小写混着写(User42@Example.com),第 03 个文件的表达式索引要用。
-- tasks:和 Day 29–31 一样的 100 万行(setseed 保证每次相同),这次 owner_id 是真正的外键,指向 users。
--        只有 1–10000 号会员有任务(和前几天一样,越小的号任务越多);10001 号以后的会员一个任务都没有。
-- 一开始只有两张表的主键和这个外键 —— 外键列 owner_id 上【没有】索引(第 04 个文件专门讲)。
\timing on
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS day32 CASCADE;
CREATE SCHEMA day32;
SET search_path = day32;

CREATE TABLE users (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      text NOT NULL,
  deleted_at timestamptz
);
INSERT INTO users (email)
SELECT 'User' || n || '@Example.com' FROM generate_series(1, 100000) AS n;

CREATE TABLE tasks (
  id         bigint GENERATED ALWAYS AS IDENTITY,
  owner_id   bigint NOT NULL,
  title      text NOT NULL,
  done       boolean NOT NULL,
  created_at timestamptz NOT NULL
);
SELECT setseed(0.32);
INSERT INTO tasks (owner_id, title, done, created_at)
SELECT 1 + floor(9999 * power(random(), 4))::bigint,
       '任务 ' || n,
       random() < 0.9,
       timestamptz '2024-01-01 00:00+00' + n * interval '1 minute' + random() * interval '30 seconds'
FROM generate_series(1, 1000000) AS n;
ALTER TABLE tasks ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);
-- 先导入、后加外键:加外键时数据库一次性检查所有行(比逐行检查快);删除会员时级联删除他的任务
ALTER TABLE tasks ADD CONSTRAINT tasks_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE;
\timing off
VACUUM ANALYZE users;
VACUUM ANALYZE tasks;

SELECT relname AS 表或索引, pg_size_pretty(pg_relation_size(oid)) AS 大小
FROM pg_class WHERE relnamespace = 'day32'::regnamespace AND relkind IN ('r', 'i') ORDER BY relname;
SELECT round(100.0 * count(*) FILTER (WHERE NOT done) / count(*), 1) AS "未完成的占比 %" FROM tasks;
