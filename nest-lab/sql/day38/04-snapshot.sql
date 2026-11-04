-- Day 38 · 04:快照 = 拍照那一刻「哪些事务已经结束、哪些还在进行」的名单
-- pg_current_snapshot() 的格式是 xmin:xmax:xip_list
--   xmin:比它小的事务都已经结束(提交或回滚)
--   xmax:从它开始(含)的事务在拍照时还没开始 → 一律看不见
--   xip_list:在 xmin 和 xmax 之间、拍照时还在进行的事务 → 也看不见
-- 一个行版本对这张快照可见 ⇔ 它的 xmin 已提交且「在快照之前」,并且 xmax 为 0 或者 xmax 对这张快照不可见(还没提交 / 回滚了 / 在快照之后)
-- 两个会话的演示在观察脚本里(npm run day38),手动步骤:
--   窗口 A:SET search_path = day38; BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT pg_current_snapshot(), v FROM items WHERE id = 1;
--   窗口 B:SET search_path = day38; UPDATE items SET v = v + 100 WHERE id = 1;   -- 不会等 A(读不阻塞写)
--   窗口 A:SELECT ctid, xmin, xmax, v FROM items WHERE id = 1;    -- A 还看到旧版本
--   窗口 B:SELECT ctid, xmin, xmax, v FROM items WHERE id = 1;    -- B 看到新版本
--   窗口 A:COMMIT;
SET search_path = day38;
\echo '=== ① 现在的快照'
SELECT pg_current_snapshot() AS 快照, pg_snapshot_xmin(pg_current_snapshot()) AS xmin, pg_snapshot_xmax(pg_current_snapshot()) AS xmax;
\echo '=== ② 一个事务在第一次写之前没有事务号;写了才分配'
BEGIN;
SELECT pg_current_xact_id_if_assigned() AS "SELECT 之后的事务号(空 = 还没分配)";
UPDATE items SET v = v WHERE id = 1;
SELECT pg_current_xact_id_if_assigned() AS "UPDATE 之后的事务号";
ROLLBACK;
