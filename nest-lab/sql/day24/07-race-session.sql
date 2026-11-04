-- Day 24 · 07:一个「注册请求」的流程,和应用层常见写法一样:先查,没有再插。
-- 由观察脚本同时启动两份(psql -v tbl=… -v who=…),模拟两个请求同时注册同一个邮箱。
-- 也可以开两个终端手动跑:psql -v tbl=signup_no_uk -v who=A -f sql/day24/07-race-session.sql
SET search_path = day24;
\set VERBOSITY default
BEGIN;
SELECT :'who' AS 请求, count(*) AS 查到已注册几个 FROM :tbl WHERE email = 'carol@example.com';
-- 模拟「查完到插入之间」的那点时间(业务逻辑、网络……);\gset 只是让 psql 不打印这一行的结果
SELECT pg_sleep(1) AS slept \gset
INSERT INTO :tbl (email, who) VALUES ('carol@example.com', :'who');
COMMIT;
