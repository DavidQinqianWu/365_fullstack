-- Day 37 · 03:隔离级别是「每个事务自己选的」,不是全库一个开关
SET search_path = day37;
\echo '=== ① 默认的隔离级别'
SHOW default_transaction_isolation;
\echo '=== ② 在 BEGIN 里指定,或者在事务的第一条语句之前 SET TRANSACTION'
BEGIN ISOLATION LEVEL REPEATABLE READ;
SHOW transaction_isolation;
COMMIT;
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SHOW transaction_isolation;
COMMIT;
\echo '--- 已经执行过查询之后再改,会报错'
BEGIN;
SELECT 1;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
ROLLBACK;
\echo '=== ③ READ UNCOMMITTED:可以设置,名字也会显示出来,但 PostgreSQL 里它的行为和 READ COMMITTED 完全一样'
BEGIN ISOLATION LEVEL READ UNCOMMITTED;
SHOW transaction_isolation;
COMMIT;
\echo '=== ④ 也可以改「这个会话的默认值」(SET SESSION CHARACTERISTICS),或者给角色 / 数据库设默认值(ALTER ROLE … SET default_transaction_isolation)'
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SHOW default_transaction_isolation;
RESET default_transaction_isolation;
SHOW default_transaction_isolation;
