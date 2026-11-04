-- Day 30 · 06:三种 JOIN 算法 —— 同样是「用户 JOIN 任务」,数据不同,优化器选的做法不同
-- enable_nestloop / enable_hashjoin / enable_mergejoin = off 只用于学习对照:让你看到「不选它」时会怎样。生产里不要动。
SET search_path = day30;
SET max_parallel_workers_per_gather = 0;

-- ① Nested Loop:外层只有 2 个用户,每个用户去 tasks 的 owner_id 索引里查一次
EXPLAIN (ANALYZE) SELECT u.name, t.title FROM users u JOIN tasks t ON t.owner_id = u.id WHERE u.id IN (5000, 5001);
SET enable_nestloop = off;
EXPLAIN (ANALYZE) SELECT u.name, t.title FROM users u JOIN tasks t ON t.owner_id = u.id WHERE u.id IN (5000, 5001);
RESET enable_nestloop;

-- ② Hash Join:100 万任务 × 1 万用户,先把小的那张(users)做成哈希表,再扫一遍大的
EXPLAIN (ANALYZE) SELECT u.plan, count(*) FROM tasks t JOIN users u ON u.id = t.owner_id GROUP BY u.plan;
-- 哈希表装不下 work_mem 时,分成几批(Batches)写到临时文件里
SET work_mem = '64kB';
EXPLAIN (ANALYZE) SELECT u.plan, count(*) FROM tasks t JOIN users u ON u.id = t.owner_id GROUP BY u.plan;
RESET work_mem;
-- 不许用 Hash Join 呢?
SET enable_hashjoin = off;
EXPLAIN (ANALYZE) SELECT u.plan, count(*) FROM tasks t JOIN users u ON u.id = t.owner_id GROUP BY u.plan;
RESET enable_hashjoin;

-- ③ Merge Join:两边都能按 owner_id / id 的顺序读出来(都有索引),而且结果本来就要按这个顺序
EXPLAIN (ANALYZE) SELECT u.id, u.name, t.id FROM users u JOIN tasks t ON t.owner_id = u.id ORDER BY u.id LIMIT 100;
SET enable_mergejoin = off;
EXPLAIN (ANALYZE) SELECT u.id, u.name, t.id FROM users u JOIN tasks t ON t.owner_id = u.id ORDER BY u.id LIMIT 100;
RESET enable_mergejoin;
