-- Day 36 · 06:autocommit、DDL 也是事务性的、事务里的时间
SET search_path = day36;
SET client_min_messages = warning;

\echo '=== ① autocommit:不写 BEGIN 时,每条语句自己是一个事务(事务号每次都不同)'
SELECT pg_current_xact_id() AS 第一条语句的事务号;
SELECT pg_current_xact_id() AS 第二条语句的事务号;
BEGIN;
SELECT pg_current_xact_id() AS "BEGIN 之后 · 第一条";
SELECT pg_current_xact_id() AS "BEGIN 之后 · 第二条";
COMMIT;

\echo '=== ② DDL 也能回滚:建表、加列、删列,ROLLBACK 之后都像没发生过'
BEGIN;
CREATE TABLE ddl_demo (id int);
INSERT INTO ddl_demo VALUES (1);
ALTER TABLE notes ADD COLUMN tmp text;
ALTER TABLE notes DROP COLUMN body;
SELECT column_name FROM information_schema.columns WHERE table_schema = 'day36' AND table_name = 'notes' ORDER BY ordinal_position;
ROLLBACK;
SELECT to_regclass('day36.ddl_demo') AS "ddl_demo 还在吗";
SELECT column_name FROM information_schema.columns WHERE table_schema = 'day36' AND table_name = 'notes' ORDER BY ordinal_position;

\echo '=== ③ now() 是「事务开始的时刻」,整个事务里不变;clock_timestamp() 是「这一刻」'
BEGIN;
SELECT now() AS now_1, clock_timestamp() AS clock_1;
SELECT pg_sleep(0.3);
SELECT now() AS now_2, clock_timestamp() AS clock_2;
COMMIT;
