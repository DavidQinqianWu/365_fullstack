-- Day 39 · 06:工具 —— 谁在等谁、等了多久、在执行什么 SQL(复制到任何库都能用)
-- pg_blocking_pids(pid):挡住这个进程的进程列表(包括持有冲突锁的,以及在锁队列里排在它前面、和它冲突的)
SELECT w.pid                                 AS 等待者,
       now() - w.query_start                 AS 等了多久,
       w.wait_event_type || ':' || w.wait_event AS 在等什么,
       left(w.query, 60)                     AS 等待者的语句,
       pg_blocking_pids(w.pid)               AS 被谁挡住,
       b.pid                                 AS 挡路的,
       b.state                               AS 挡路者状态,
       now() - b.xact_start                  AS 挡路者的事务开了多久,
       left(b.query, 60)                     AS 挡路者最后一条语句
FROM pg_stat_activity w
JOIN LATERAL unnest(pg_blocking_pids(w.pid)) AS bp(pid) ON true
JOIN pg_stat_activity b ON b.pid = bp.pid
WHERE w.datname = current_database()
ORDER BY w.query_start;
