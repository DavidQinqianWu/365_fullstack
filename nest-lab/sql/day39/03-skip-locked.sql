-- Day 39 · 03:用 FOR UPDATE SKIP LOCKED 实现任务队列 —— 每个 worker 的一次「领任务 → 处理 → 标记完成」
-- 观察脚本起 4 个 worker 并发跑这个循环。手动版:开两个窗口,都 SET search_path = day39; 然后一起执行下面这段,看领到的 id 是否不同。
SET search_path = day39;
BEGIN;
-- ① 领一个:跳过别人正锁着的行,不排队;领到的 id 存进 psql 变量 :job_id
SELECT id AS job_id, payload FROM jobs
WHERE status = 'pending'
ORDER BY id
FOR UPDATE SKIP LOCKED
LIMIT 1 \gset
\echo 领到了 :job_id :payload
-- ② 处理(这里用 pg_sleep 假装干了 2 秒活,方便另一个窗口同时领)
SELECT pg_sleep(2);
-- ③ 标记完成:只改自己领到、自己锁着的那一行
UPDATE jobs SET status = 'done', worker = 'psql', times_done = times_done + 1, finished_at = clock_timestamp()
WHERE id = :job_id;
COMMIT;
SELECT status, count(*) FROM jobs GROUP BY status ORDER BY status;
