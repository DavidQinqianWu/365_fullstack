-- Day 29 · 02:没有任何索引时,三种「找一行 / 找几行」的查询,数据库打算怎么做?
-- EXPLAIN 只给出计划,不执行;EXPLAIN ANALYZE 会真的执行一遍,并报告实际耗时
SET search_path = day29;

-- ① 按 id 找一行(nest-lab 的 GET /tasks/:id)
EXPLAIN SELECT * FROM tasks WHERE id = 500000;
-- ② 按 owner 找他的任务(一个普通用户,大约 50 个)
EXPLAIN SELECT * FROM tasks WHERE owner_id = 5000;
-- ③ 按标题精确找
EXPLAIN SELECT * FROM tasks WHERE title = '任务 777777';

-- 真的跑一次,看实际耗时(Execution Time)
EXPLAIN ANALYZE SELECT * FROM tasks WHERE id = 500000;
