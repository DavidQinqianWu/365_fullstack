-- Day 39 · 07:咨询锁(advisory lock)—— 不锁任何行或表,只锁一个「数字」,谁拿到谁干
-- 用途:多个副本里同一个定时任务只让一个跑;同一个用户的导入任务不要并发……
-- 三个窗口的手动步骤:都执行 SELECT pg_try_advisory_lock(42);  只有第一个返回 true;
--   拿到的那个窗口 SELECT pg_advisory_unlock(42); 之后,别人才能拿到。
SET search_path = day39;
\echo '=== ① 事务级:pg_advisory_xact_lock,事务结束自动释放'
BEGIN;
SELECT pg_advisory_xact_lock(7);
SELECT locktype, objid, mode, granted FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid();
COMMIT;
SELECT count(*) AS "COMMIT 之后还剩几个咨询锁" FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid();
\echo '=== ② 会话级:pg_advisory_lock / pg_try_advisory_lock,事务结束也不释放,要手动 unlock 或断开连接'
BEGIN;
SELECT pg_try_advisory_lock(42) AS 拿到了吗;
COMMIT;
SELECT count(*) AS "COMMIT 之后还剩几个咨询锁" FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid();
SELECT pg_advisory_unlock(42) AS 释放成功;
SELECT pg_advisory_unlock(42) AS "再释放一次(没拿着)";
