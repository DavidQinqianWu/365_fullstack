-- Day 38 · 08:事务号回卷(wraparound)与冻结(freeze)—— 点到为止
-- 事务号是 32 位的(约 42 亿个,循环使用);「比我新还是比我旧」靠前后各 21 亿的窗口来判断。
-- 一个很老的行版本如果一直不处理,事务号转了一圈之后会被误判成「来自未来」→ 突然看不见了。
-- 所以 VACUUM 会把足够老的行版本「冻结」(标记为对所有人永远可见);autovacuum 会在表的年龄超过 autovacuum_freeze_max_age(默认 2 亿)时强制做。
SET search_path = day38;
\echo '=== ① 每个库最老的未冻结事务号离现在多远(越接近 20 亿越危险)'
SELECT datname, age(datfrozenxid) AS 年龄 FROM pg_database ORDER BY 2 DESC;
\echo '=== ② day38 的表'
SELECT relname, age(relfrozenxid) AS 年龄 FROM pg_class WHERE relnamespace = 'day38'::regnamespace AND relkind = 'r' ORDER BY 1;
\echo '=== ③ VACUUM FREEZE 之后'
VACUUM (FREEZE) items;
SELECT relname, age(relfrozenxid) AS 年龄 FROM pg_class WHERE oid = 'day38.items'::regclass;
