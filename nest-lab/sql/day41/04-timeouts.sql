-- Day 41 · 04:超时三件套 —— 在哪里设、谁覆盖谁(单个会话可以一口气跑完;npm run day41 第 8 幕会跑它)
--
--   statement_timeout                     一条语句最多跑多久(到点:57014 canceling statement due to statement timeout)
--   lock_timeout                          等锁最多等多久(Day 39;到点:55P03 canceling statement due to lock timeout)
--   idle_in_transaction_session_timeout   事务开着、什么都不做,最多发呆多久(到点:服务器直接断开这个连接,
--                                         FATAL 25P03 terminating connection due to idle-in-transaction timeout)
--
-- 能设的地方,从「范围最大、最先生效」到「范围最小、最后生效」(后面的覆盖前面的):
--   postgresql.conf                       整个实例(要超级用户 + 重载)
--   ALTER DATABASE nest_lab SET …         这个库的所有新连接(库的 owner 可以设)
--   ALTER ROLE nest_lab SET …             这个用户的所有新连接(用户可以给自己设)
--   ALTER ROLE nest_lab IN DATABASE nest_lab SET …   这个用户连这个库时
--   连接参数 options=-c statement_timeout=5s         这一个连接(⚠️ PgBouncer 不接受,第 7 幕)
--   SET …                                 这个会话剩下的时间(⚠️ transaction 模式下会串,第 5 幕)
--   SET LOCAL …                           只到这个事务结束
-- pg_settings.source 一列告诉你「现在这个值是从哪一层来的」。
--
-- 推荐给 nest-lab 的值(见 docs/db-timeouts.md)—— 下面三行是建议,不在本文件里执行:
--   ALTER ROLE nest_lab IN DATABASE nest_lab SET statement_timeout = '5s';
--   ALTER ROLE nest_lab IN DATABASE nest_lab SET lock_timeout = '2s';
--   ALTER ROLE nest_lab IN DATABASE nest_lab SET idle_in_transaction_session_timeout = '15s';
SET client_min_messages = warning;

SELECT name, setting, unit, source
FROM pg_settings
WHERE name IN ('statement_timeout', 'lock_timeout', 'idle_in_transaction_session_timeout')
ORDER BY name;

\echo '---- SET LOCAL:只在这个事务里生效 ----'
BEGIN;
SET LOCAL statement_timeout = '200ms';
SELECT name, setting, source FROM pg_settings WHERE name = 'statement_timeout';
COMMIT;
SELECT name, setting, source FROM pg_settings WHERE name = 'statement_timeout';
\echo '↑ COMMIT 之后自动回到原来的值'

\echo '---- 已经保存在库 / 角色上的设置(ALTER DATABASE / ALTER ROLE … SET 写在这里;空 = 没有)----'
SELECT coalesce(r.rolname, '(所有用户)') AS 用户, coalesce(d.datname, '(所有库)') AS 库, s.setconfig AS 设置
FROM pg_db_role_setting s
LEFT JOIN pg_roles r ON r.oid = s.setrole
LEFT JOIN pg_database d ON d.oid = s.setdatabase;
