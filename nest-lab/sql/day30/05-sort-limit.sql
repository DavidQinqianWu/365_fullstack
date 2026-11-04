-- Day 30 · 05:排序与 LIMIT
SET search_path = day30;
SET max_parallel_workers_per_gather = 0;
SHOW work_mem;

-- 按标题给 100 万行排序:work_mem 默认 4MB,装不下 → 写到磁盘上分段排序再合并
EXPLAIN (ANALYZE) SELECT * FROM tasks ORDER BY title;
-- 给这一次查询 256MB:全在内存里排
SET work_mem = '256MB';
EXPLAIN (ANALYZE) SELECT * FROM tasks ORDER BY title;
RESET work_mem;

-- 只要前 10 个:不用把 100 万行都排好,只要一直维护「目前最小的 10 个」(top-N heapsort)
EXPLAIN (ANALYZE) SELECT * FROM tasks ORDER BY title LIMIT 10;
-- 有现成的有序索引时,LIMIT 让计划读到第 10 行就停(Day 29 的 Index Scan Backward)
EXPLAIN (ANALYZE) SELECT * FROM tasks ORDER BY id DESC LIMIT 10;
