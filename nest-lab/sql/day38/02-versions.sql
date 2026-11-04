-- Day 38 · 02:每一行都有好几个「版本」—— 系统列 xmin / xmax / ctid
--   xmin:写下这个版本的事务号;xmax:让这个版本失效(删除 / 被更新)的事务号,0 = 还没人动过它;ctid:这个版本在表里的物理位置(页号, 页内第几个)
SET search_path = day38;

\echo '=== ① 刚插入:xmin = 插入它的事务号,xmax = 0'
SELECT ctid, xmin, xmax, id, v FROM items ORDER BY id;

\echo '=== ② UPDATE 不是改原地:写了一个新版本(新的 ctid、新的 xmin),旧版本被标上 xmax'
BEGIN;
SELECT pg_current_xact_id() AS "这个事务的事务号";
UPDATE items SET v = v + 1 WHERE id = 1;
SELECT ctid, xmin, xmax, id, v FROM items WHERE id = 1;   -- 新版本:ctid 变了,xmin = 本事务
COMMIT;
SELECT ctid, xmin, xmax, id, v FROM items ORDER BY id;

\echo '=== ③ 回滚的 UPDATE:旧版本的 xmax 被写上了,但那个事务回滚了 → 这一行照样可见'
BEGIN;
SELECT pg_current_xact_id() AS "要回滚的事务号";
UPDATE items SET v = 999 WHERE id = 2;
ROLLBACK;
SELECT ctid, xmin, xmax, id, v FROM items WHERE id = 2;   -- xmax 不是 0,但 v 还是 20
\echo '--- xmax 写着的事务号,状态是什么?'
SELECT xmax AS 事务号, pg_xact_status(xmax::text::xid8) AS 状态 FROM items WHERE id = 2;

\echo '=== ④ DELETE 也不会立刻把行抹掉:只是在当前版本上写 xmax(看不到了,但还占着位置,第 03 个文件用 pageinspect 看)'
DELETE FROM items WHERE id = 3;
SELECT ctid, xmin, xmax, id, v FROM items ORDER BY id;
