-- Day 40 · 02:悲观锁 —— 先压上镇纸(SELECT … FOR NO KEY UPDATE),再读、判断、写
-- 需要先跑 01-lost-update.sql(建 schema day40)。npm run day40 的第 2 幕用两个连接自动跑下面的手动步骤。
--
-- 两个窗口手动做:
--   窗口 A:BEGIN;
--   窗口 A:SELECT title, done, version FROM day40.tasks WHERE id = 3 FOR NO KEY UPDATE;   -- 压上镇纸
--   窗口 B:BEGIN;
--   窗口 B:SELECT title, done, version FROM day40.tasks WHERE id = 3 FOR NO KEY UPDATE;   -- 卡住(在等 A)
--   窗口 A:UPDATE day40.tasks SET done = true, version = version + 1 WHERE id = 3;
--   窗口 A:COMMIT;
--           -- 窗口 B 这时才返回,而且读到的是 A 提交之后的 done = true、version = 2(不是旧快照)
--           -- 于是 B 的「判断」基于最新状态:任务已完成 → 不允许改标题 → ROLLBACK
--   窗口 B:ROLLBACK;
--
-- 两个对照(也可以在窗口 B 里试):
--   · 不带 FOR NO KEY UPDATE 的普通 SELECT 不会等 —— 行锁不挡读(Day 39),读到的是 A 提交前的旧值
--   · 加 NOWAIT:SELECT … FOR NO KEY UPDATE NOWAIT 立刻报 55P03 lock_not_available,不排队
--
-- 为什么是 FOR NO KEY UPDATE 不是 FOR UPDATE:我们只改 title / done / version,不改主键。
-- FOR UPDATE 会挡住别人「往子表插一行引用这个任务」时外键检查要拿的 FOR KEY SHARE(Day 39 第 2 幕),
-- FOR NO KEY UPDATE 不挡 —— 改任务的同时,别人还能往它的清单里加项(nest-lab 的清单就在子表 checklist_items 里)
SET client_min_messages = warning;
SET search_path = day40;
INSERT INTO tasks (id, title) VALUES (3, '交报销单');
SELECT id, title, done, version FROM tasks WHERE id = 3;
