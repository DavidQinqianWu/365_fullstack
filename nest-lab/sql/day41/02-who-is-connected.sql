-- Day 41 · 02:工具 —— 现在谁连着数据库、各在干什么、还剩多少名额
-- 用法:psql 里 \ir sql/day41/02-who-is-connected.sql
-- pg_stat_activity 是数据库那一侧的视图:不管你从 5432 还是经过 PgBouncer 的 6432 连进来,看到的都是 PostgreSQL 里全部的后端进程;
-- 经过 PgBouncer 时,应用的几百个客户端连接在这里只表现为 PgBouncer 开的那几个服务端连接
--
-- 看 PgBouncer 那一侧(连管理控制台:psql postgresql://nest_lab:nest_lab_dev@127.0.0.1:6432/pgbouncer):
--   SHOW POOLS;    -- cl_active / cl_waiting:客户端在用 / 在排队;sv_active / sv_idle:服务端连接在用 / 空闲
--   SHOW STATS;    -- 每个库的事务数、查询数、平均等待时间(avg_wait_time)
--   SHOW CLIENTS;  SHOW SERVERS;  SHOW CONFIG;
SELECT coalesce(nullif(application_name, ''), '(没写 application_name)') AS 应用,
       state,
       count(*)                                                          AS 连接数,
       max(now() - state_change)                                         AS 当前状态持续最久
FROM pg_stat_activity
WHERE backend_type = 'client backend'
GROUP BY 1, 2
ORDER BY 3 DESC;

SELECT current_setting('max_connections')::int
         - current_setting('superuser_reserved_connections')::int
         - current_setting('reserved_connections')::int
         - (SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend') AS 普通用户还能再开几个连接;

-- 在事务里发呆的连接(Day 38:它们挡住 VACUUM;今天:它们占着名额,经过 PgBouncer 时还占着服务端连接)
SELECT pid, usename, application_name, now() - xact_start AS 事务已开了, now() - state_change AS 发呆了, left(query, 60) AS 最后一条语句
FROM pg_stat_activity
WHERE state LIKE 'idle in transaction%'
ORDER BY xact_start;
