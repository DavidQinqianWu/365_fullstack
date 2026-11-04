-- Day 38 · 06:autovacuum —— 什么时候会自己来清理
-- 触发条件:死元组数 > autovacuum_vacuum_threshold + autovacuum_vacuum_scale_factor × reltuples(表的估计行数)
-- 默认 50 + 0.2 × 行数:1 亿行的表要攒够 2000 万个死元组才清理,对大表来说太晚了 → 按表调参
SET search_path = day38;
\echo '=== ① 全局设置(普通用户能看)'
SELECT name, setting, unit FROM pg_settings
WHERE name IN ('autovacuum', 'autovacuum_naptime', 'autovacuum_vacuum_threshold', 'autovacuum_vacuum_scale_factor',
               'autovacuum_vacuum_insert_threshold', 'autovacuum_max_workers', 'autovacuum_freeze_max_age')
ORDER BY name;
\echo '=== ② 每张表的触发线(按默认值算;av_demo 用了自己的设置)'
SELECT c.relname AS 表, c.reltuples::bigint AS 估计行数, c.reloptions AS 表上的设置,
       CASE WHEN c.relname = 'av_demo' THEN 50 ELSE 50 + 0.2 * greatest(c.reltuples, 0) END::bigint AS "死元组超过多少就清理"
FROM pg_class c WHERE c.relnamespace = 'day38'::regnamespace AND c.relkind = 'r' ORDER BY 1;
\echo '=== ③ 在 av_demo 上制造 1000 个死元组(超过它的阈值 50)'
UPDATE av_demo SET v = v + 1;
SELECT pg_stat_force_next_flush() \g /dev/null
SELECT n_dead_tup AS 死元组, last_autovacuum AS 上次自动清理, autovacuum_count AS 自动清理次数
FROM pg_stat_user_tables WHERE relid = 'day38.av_demo'::regclass;
\echo '--- autovacuum 的 launcher 每 autovacuum_naptime(默认 1 分钟)检查一次每个库,所以要等一会儿;观察脚本会在最后再看一次'
