-- Day 36 · 01:准备数据(独立的 schema day36;重跑会整个删掉重建)
--   accounts:转账的经典例子。余额不能为负(CHECK),Alice 100、Bob 50
--   boxes / items:演示「可延迟的外键」(DEFERRABLE INITIALLY DEFERRED)
--   notes:随手写几行,看回滚、保存点、DDL
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS day36 CASCADE;
CREATE SCHEMA day36;
SET search_path = day36;

CREATE TABLE accounts (
  id      int PRIMARY KEY,
  owner   text NOT NULL,
  balance numeric(12, 2) NOT NULL CHECK (balance >= 0)
);
INSERT INTO accounts VALUES (1, 'Alice', 100), (2, 'Bob', 50);

CREATE TABLE boxes (id int PRIMARY KEY);
-- 普通的外键:每条语句执行完就检查
CREATE TABLE items_now (id int PRIMARY KEY, box_id int NOT NULL REFERENCES boxes (id));
-- 可延迟的外键:事务里暂时不检查,COMMIT 的那一刻才检查
CREATE TABLE items_later (
  id     int PRIMARY KEY,
  box_id int NOT NULL REFERENCES boxes (id) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE notes (id int PRIMARY KEY, body text NOT NULL);

SELECT * FROM accounts ORDER BY id;
