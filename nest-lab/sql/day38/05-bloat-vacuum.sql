-- Day 38 · 05:死元组、表膨胀、VACUUM 与 VACUUM FULL
-- bloat 表 20 万行,关掉了它自己的 autovacuum。统计数字(n_dead_tup)每次先 pg_stat_force_next_flush() 再看,免得延迟。
SET search_path = day38;
SET client_min_messages = warning;
CREATE OR REPLACE VIEW bloat_stats AS
SELECT pg_size_pretty(pg_relation_size('day38.bloat')) AS 表大小,
       pg_size_pretty(pg_relation_size('day38.bloat_pkey')) AS 主键索引大小,
       s.n_dead_tup AS 死元组
FROM pg_stat_user_tables s WHERE s.relid = 'day38.bloat'::regclass;

\echo '=== ① 刚建好'
SELECT pg_stat_force_next_flush() \g /dev/null
SELECT * FROM bloat_stats;

\echo '=== ② 把 20 万行全部 UPDATE 3 遍(每一遍都给每一行写一个新版本)'
UPDATE bloat SET v = v + 1;
UPDATE bloat SET v = v + 1;
UPDATE bloat SET v = v + 1;
SELECT pg_stat_force_next_flush() \g /dev/null
SELECT * FROM bloat_stats;

\echo '=== ③ 死元组也会让 Index Only Scan 回表(Day 31:visibility map 被清掉了)'
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT count(*) FROM bloat WHERE id <= 50000;

\echo '=== ④ VACUUM:回收死元组的空间给这张表以后用;文件大小一般不变;不挡读写'
\timing on
VACUUM bloat;
\timing off
SELECT pg_stat_force_next_flush() \g /dev/null
SELECT * FROM bloat_stats;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT count(*) FROM bloat WHERE id <= 50000;

\echo '=== ⑤ VACUUM 之后再全部 UPDATE 一遍:新版本写进腾出来的空位,表没有再变大'
UPDATE bloat SET v = v + 1;
SELECT pg_stat_force_next_flush() \g /dev/null
SELECT * FROM bloat_stats;
VACUUM bloat;

\echo '=== ⑥ VACUUM FULL:把整张表誊抄成一个新文件,空间还给操作系统;期间整张表被 ACCESS EXCLUSIVE 锁住(读也不行,Day 39)'
\timing on
VACUUM FULL bloat;
\timing off
SELECT pg_stat_force_next_flush() \g /dev/null
SELECT * FROM bloat_stats;
