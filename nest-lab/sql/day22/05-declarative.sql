-- Day 22 · 05:SQL 是声明式的 —— 你说「要什么」,数据库决定「怎么找」
-- EXPLAIN 只显示数据库打算怎么做(执行计划),不真正执行。怎么读它是 Week 5 的内容,今天只看一眼。

EXPLAIN SELECT * FROM tasks WHERE id = 3;
EXPLAIN SELECT * FROM tasks WHERE title = '写 CRUD';
