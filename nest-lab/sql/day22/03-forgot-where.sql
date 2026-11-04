-- Day 22 · 03:最经典的事故 —— UPDATE / DELETE 忘了写 WHERE
-- 用 BEGIN ... ROLLBACK 包起来当「安全网」:ROLLBACK 会撤销事务里做过的所有修改。
-- 事务的原理(ACID、隔离级别)是 Week 6 的内容,今天只把它当安全网用。

SELECT id, title, done FROM tasks ORDER BY id;

BEGIN;

-- 本来想写 UPDATE tasks SET done = true WHERE id = 1; 结果手一快……
UPDATE tasks SET done = true;
SELECT id, title, done FROM tasks ORDER BY id;

-- 更糟的版本
DELETE FROM tasks;
SELECT count(*) AS 剩下几行 FROM tasks;

ROLLBACK;   -- 撤销!

SELECT id, title, done FROM tasks ORDER BY id;
