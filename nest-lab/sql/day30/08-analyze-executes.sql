-- Day 30 · 08:EXPLAIN ANALYZE 会真的执行 —— 对 UPDATE / DELETE 一定要包在事务里
SET search_path = day30;
SELECT count(*) AS 删除之前 FROM tasks WHERE owner_id = 5000;
BEGIN;
EXPLAIN (ANALYZE) DELETE FROM tasks WHERE owner_id = 5000;
SELECT count(*) AS 事务里再数一次 FROM tasks WHERE owner_id = 5000;
ROLLBACK;
SELECT count(*) AS 回滚之后 FROM tasks WHERE owner_id = 5000;
-- 只想看计划、不想执行:不加 ANALYZE
EXPLAIN DELETE FROM tasks WHERE owner_id = 5000;
