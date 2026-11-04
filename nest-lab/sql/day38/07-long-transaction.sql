-- Day 38 · 07:长事务挡住清理 —— 这是会话 B 那一侧的语句;会话 A 要先开一个「拿着旧快照不走」的事务:
--   窗口 A:BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT count(*) FROM day38.longtx;   -- 然后什么都不做,挂着
--   (注意:默认的 READ COMMITTED 下,只 SELECT 过、没写过的空闲事务不拿快照,挡不住清理;REPEATABLE READ,或者写过一行的事务才会挡)
--   窗口 B:\i sql/day38/07-long-transaction.sql
--   窗口 A:COMMIT;
--   窗口 B:VACUUM (VERBOSE) day38.longtx;    -- 这次能清掉了
SET search_path = day38;
\echo '=== ① 谁开着事务不走?'
SELECT pid, state, now() - xact_start AS 事务已开了多久, backend_xid, backend_xmin, age(backend_xmin) AS "backend_xmin 落后了几个事务号", left(query, 50) AS 最后一条语句
FROM pg_stat_activity
WHERE datname = current_database() AND pid <> pg_backend_pid() AND (backend_xmin IS NOT NULL OR backend_xid IS NOT NULL)
ORDER BY xact_start;
\echo '=== ② 把 1 万行全部 UPDATE 一遍,再 VACUUM'
UPDATE longtx SET v = v + 1;
VACUUM (VERBOSE) longtx;
