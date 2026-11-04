-- Day 29 · 03:行在表里「住在哪」—— ctid = (第几页, 页里的第几个)
-- 表本身(heap)是一页页 8 KB 的「账页」,行按写入顺序放进去,没有按任何列排序
SET search_path = day29;
SHOW block_size;
SELECT ctid, id, title FROM tasks ORDER BY id LIMIT 3;
SELECT ctid, id, title FROM tasks WHERE id IN (120, 121, 122) ORDER BY id;
-- 改一行:PostgreSQL 写一个新版本,旧版本作废(MVCC,Week 6)—— 所以 ctid 变了(Day 22 里「改过的行跑到后面」就是这个)
BEGIN;
UPDATE tasks SET done = NOT done WHERE id = 1;
SELECT ctid, id, title FROM tasks WHERE id = 1;
ROLLBACK;
-- 一页大概装多少行
SELECT count(*) AS 第0页里的行数 FROM tasks WHERE (ctid::text::point)[0] = 0;
SELECT pg_relation_size('tasks') / 8192 AS 表一共几页;
