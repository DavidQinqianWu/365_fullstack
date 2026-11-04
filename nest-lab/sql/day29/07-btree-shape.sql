-- Day 29 · 07:B-tree 长什么样 —— 用 pageinspect 扩展看主键索引的「目录分层」
-- ⚠️ pageinspect 需要超级用户:Docker 里 POSTGRES_USER(nest_lab)本身就是超级用户;
--    本机安装时用 sudo -u postgres psql -d nest_lab -f sql/day29/07-btree-shape.sql
CREATE EXTENSION IF NOT EXISTS pageinspect;
-- 元信息页:root = 根页的页号,level = 根页在第几层(叶子是第 0 层)→ 树高 = level + 1
SELECT root, level, level + 1 AS 树高 FROM bt_metap('day29.tasks_pkey');
-- 根页:里面有几个「指路牌」
SELECT live_items AS 根页里的条目数, btpo_level AS 层 FROM bt_page_stats('day29.tasks_pkey', (SELECT root FROM bt_metap('day29.tasks_pkey')));
-- 随便一个叶子页(第 1 页):装了多少个键,还剩多少空间
SELECT live_items AS 这一页的条目数, page_size, free_size, btpo_level AS 层 FROM bt_page_stats('day29.tasks_pkey', 1);
-- 叶子页里的前几个条目:键(id 的十六进制)→ 这一行在表里的位置(ctid)
-- (第 1 个条目是这一页的「上限键」high key:比它大的键去右边那一页找;真正的数据从第 2 个开始)
SELECT itemoffset, ctid, data FROM bt_page_items('day29.tasks_pkey', 1) LIMIT 4;
-- 索引一共几页
SELECT pg_relation_size('day29.tasks_pkey') / 8192 AS 索引一共几页;
