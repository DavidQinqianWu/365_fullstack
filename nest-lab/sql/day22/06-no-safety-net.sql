-- Day 22 · 06:没有 BEGIN 时,ROLLBACK 救不回来
-- psql 默认「自动提交」(autocommit):每条语句一执行完就永久生效。
-- 这里故意只删一行来演示;换成忘了 WHERE 的 DELETE FROM tasks,整张表就这样没了。

DELETE FROM tasks WHERE id = 4;
ROLLBACK;          -- 想反悔?
SELECT id, title FROM tasks ORDER BY id;
