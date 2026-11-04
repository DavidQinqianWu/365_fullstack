-- Day 30 · 02:读一棵计划树 ——「未完成任务最多的 3 个用户」
-- 为了让计划树好读,先关掉并行(Gather / Parallel 节点放到本文件最后单独看)。这个开关只为学习,生产别动。
SET search_path = day30;
SET max_parallel_workers_per_gather = 0;

EXPLAIN (ANALYZE, BUFFERS)
SELECT u.name, count(*) AS 未完成数
FROM tasks t
JOIN users u ON u.id = t.owner_id
WHERE NOT t.done
GROUP BY u.name
ORDER BY 未完成数 DESC
LIMIT 3;

-- 打开并行(默认值)再看一次:多出 Gather 和 loops=3
RESET max_parallel_workers_per_gather;
EXPLAIN (ANALYZE)
SELECT count(*) FROM tasks WHERE title LIKE '任务 9%';
