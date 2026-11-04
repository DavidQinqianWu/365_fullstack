-- Day 37 · 01:准备数据(独立的 schema day37;重跑会整个删掉重建)
--   accounts:读同一行(脏读、不可重复读)
--   tasks:按条件数行(幻读),以及「每个用户最多 3 个未完成任务」(写偏斜,nest-lab 风格)
--   counters:「读 → 在应用里算 → 写回」(丢失更新)
--   doctors:值班表,「至少留一个人值班」(写偏斜,经典例子)
-- 每个场景开始前,观察脚本会执行 02-reset.sql 把数据复原。
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS day37 CASCADE;
CREATE SCHEMA day37;
SET search_path = day37;

CREATE TABLE accounts (id int PRIMARY KEY, balance int NOT NULL);
CREATE TABLE tasks (
  id       int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id int NOT NULL,
  title    text NOT NULL,
  done     boolean NOT NULL DEFAULT false
);
CREATE TABLE counters (id int PRIMARY KEY, n int NOT NULL);
CREATE TABLE doctors (name text PRIMARY KEY, on_call boolean NOT NULL);
\ir 02-reset.sql
SELECT 'accounts' AS 表, count(*) FROM accounts UNION ALL SELECT 'tasks', count(*) FROM tasks
UNION ALL SELECT 'counters', count(*) FROM counters UNION ALL SELECT 'doctors', count(*) FROM doctors;
