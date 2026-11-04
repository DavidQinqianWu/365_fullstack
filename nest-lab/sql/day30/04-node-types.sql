-- Day 30 · 04:扫描节点的几种样子
SET search_path = day30;
SET max_parallel_workers_per_gather = 0;

-- Index Scan:在索引里找到位置,再回表取整行
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM tasks WHERE id BETWEEN 1000 AND 1100;
-- Index Only Scan:要的列索引里都有,连表都不用回(原理和条件 Day 31 讲)
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM tasks WHERE id BETWEEN 1000 AND 1100;

-- Bitmap:先在索引里把要去的页都标出来,再按页号顺序去表里取
EXPLAIN (ANALYZE, BUFFERS) SELECT count(title) FROM tasks WHERE owner_id BETWEEN 2 AND 4;
-- work_mem 很小时,位图记不下「每一页的哪几行」,只能退化成「只记页号」(lossy),到了页里再逐行复查
SET work_mem = '64kB';
EXPLAIN (ANALYZE, BUFFERS) SELECT count(title) FROM tasks WHERE owner_id BETWEEN 2 AND 4;
RESET work_mem;
