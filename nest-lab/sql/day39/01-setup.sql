-- Day 39 · 01:准备数据(独立的 schema day39;重跑会整个删掉重建)
--   accounts / transfers:行锁、外键检查拿的锁、死锁
--   jobs:用 SKIP LOCKED 实现的任务队列(200 个任务)
--   big:DDL 锁队列(ALTER TABLE 要 ACCESS EXCLUSIVE)
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS day39 CASCADE;
CREATE SCHEMA day39;
SET search_path = day39;

CREATE TABLE accounts (id int PRIMARY KEY, owner text NOT NULL, balance int NOT NULL);
INSERT INTO accounts VALUES (1, 'Alice', 100), (2, 'Bob', 50);
CREATE TABLE transfers (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, account_id int NOT NULL REFERENCES accounts (id), amount int NOT NULL);

CREATE TABLE jobs (
  id           int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payload      text NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  worker       text,
  times_done   int NOT NULL DEFAULT 0,          -- 被处理了几次(正确的队列里,每个任务都应该是 1)
  finished_at  timestamptz
);
INSERT INTO jobs (payload) SELECT '发送提醒邮件 #' || g FROM generate_series(1, 200) AS g;
-- 只给「待处理」的任务建索引:领任务的查询只看这一小部分(Day 32 的部分索引)
CREATE INDEX jobs_pending_idx ON jobs (id) WHERE status = 'pending';

CREATE TABLE big (id int PRIMARY KEY, v int NOT NULL);
INSERT INTO big SELECT g, 0 FROM generate_series(1, 100000) AS g;
ANALYZE;
SELECT 'accounts' AS 表, count(*) FROM accounts UNION ALL SELECT 'jobs', count(*) FROM jobs UNION ALL SELECT 'big', count(*) FROM big;
