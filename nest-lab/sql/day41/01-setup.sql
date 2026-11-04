-- Day 41 · 01:准备数据。npm run day41 会先用 scripts/db-reset.mjs --schema day41 建好 nest-lab 的表结构(tasks、checklist_items),
-- 再执行本文件补一张演示 lock_timeout 用的小表。全程只碰 schema day41,不碰 app 和 app_test。
\set ON_ERROR_STOP on
SET client_min_messages = warning;
SET search_path = day41;

CREATE TABLE accounts (id int PRIMARY KEY, owner text NOT NULL, balance int NOT NULL);
INSERT INTO accounts VALUES (1, 'Alice', 100), (2, 'Bob', 50);

-- 本机的连接上限:max_connections 里有 superuser_reserved_connections 个是留给超级用户的,
-- 普通用户(nest_lab)最多能用 max_connections - superuser_reserved_connections - reserved_connections 个
SELECT current_setting('max_connections')::int                 AS max_connections,
       current_setting('superuser_reserved_connections')::int  AS 留给超级用户,
       current_setting('reserved_connections')::int            AS 留给_pg_use_reserved_connections,
       (SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend') AS 现在的客户端连接数;
