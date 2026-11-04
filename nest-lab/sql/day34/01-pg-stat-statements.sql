-- Day 34 · 01:pg_stat_statements —— 账房的「每日工作量统计表」
-- 前提(一次性,要超级用户):
--   ① postgresql.conf 里 shared_preload_libraries = 'pg_stat_statements',然后重启 PostgreSQL
--      (Docker:compose.yaml 里 command: postgres -c shared_preload_libraries=pg_stat_statements)
--   ② 在 nest_lab 库里 CREATE EXTENSION pg_stat_statements;(它不是受信任的扩展,普通用户建不了)
--   ③ 想让 nest_lab 自己能清零统计:GRANT EXECUTE ON FUNCTION pg_stat_statements_reset(oid, oid, bigint) TO nest_lab;
-- 这个文件只读统计,不清零。
SET client_min_messages = warning;

\echo '=== ① 装好了吗(SHOW shared_preload_libraries 要 pg_read_all_settings 权限,普通用户看不了;能查到下面的视图就说明已经加载)'
SELECT extname AS 扩展, extversion AS 版本 FROM pg_extension WHERE extname = 'pg_stat_statements';
SELECT count(*) AS 已记录的语句数 FROM pg_stat_statements;

\echo '=== ② 按「总耗时」排的前 8 条(只看本库里查 tasks 的语句)'
-- total_exec_time = calls × mean_exec_time:一天里「一共花了多少时间」,这才是该先优化谁的依据
-- 每条 SQL 前面都是同一段 SELECT_TASKS,这里把它缩成 [SELECT_TASKS],只留下不同的部分
SELECT calls AS 次数,
       round(total_exec_time::numeric, 0) AS 总耗时_ms,
       round(mean_exec_time::numeric, 2) AS 平均_ms,
       round(max_exec_time::numeric, 1) AS 最慢_ms,
       rows AS 返回行数,
       shared_blks_hit AS 缓存命中页, shared_blks_read AS 读盘页,
       round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 1) AS "占比 %",
       regexp_replace(regexp_replace(query, '\s+', ' ', 'g'), '^SELECT t\.id, t\.title.*\) cl ON \$\d+', '[SELECT_TASKS]') AS 语句
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND query LIKE '%tasks%' AND query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 8;

\echo '=== ③ 同一条语句、不同的参数,会被合成一行(查询被「规范化」:字面值都变成 $1、$2)'
SELECT calls AS 次数, round(mean_exec_time::numeric, 2) AS 平均_ms, round(min_exec_time::numeric, 2) AS 最快_ms,
       round(max_exec_time::numeric, 1) AS 最慢_ms, round(stddev_exec_time::numeric, 1) AS 标准差_ms,
       regexp_replace(regexp_replace(query, '\s+', ' ', 'g'), '^SELECT t\.id, t\.title.*\) cl ON \$\d+', '[SELECT_TASKS]') AS 语句
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND query LIKE '%ILIKE%' AND query NOT LIKE '%pg_stat_statements%'
ORDER BY calls DESC
LIMIT 3;
