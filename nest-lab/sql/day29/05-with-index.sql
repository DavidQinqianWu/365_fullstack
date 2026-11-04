-- Day 29 · 05:同样三个查询,有了索引以后
SET search_path = day29;
EXPLAIN SELECT * FROM tasks WHERE id = 500000;
EXPLAIN SELECT * FROM tasks WHERE owner_id = 5000;
EXPLAIN SELECT * FROM tasks WHERE title = '任务 777777';
EXPLAIN ANALYZE SELECT * FROM tasks WHERE id = 500000;
-- B-tree 叶子页是排好序、彼此相连的:范围查询和 ORDER BY 也能用上它
EXPLAIN SELECT * FROM tasks WHERE id BETWEEN 1000 AND 1100;
EXPLAIN SELECT * FROM tasks ORDER BY id DESC LIMIT 10;
-- 但卡片盒按 owner_id 排,帮不了「按 created_at 找」
EXPLAIN SELECT * FROM tasks WHERE created_at >= '2025-06-01' AND created_at < '2025-06-02';
