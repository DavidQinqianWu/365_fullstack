-- Day 22 · 04:表里的行没有「顺序」
-- 不写 ORDER BY 时,返回顺序是「数据库这次碰巧怎么读的」,不是插入顺序,也不保证下次一样。

SELECT id, title FROM tasks;                 -- 没写 ORDER BY

UPDATE tasks SET title = '学 psql(改过)' WHERE id = 1;

SELECT id, title FROM tasks;                 -- 还是没写 ORDER BY:顺序变了吗?

SELECT id, title FROM tasks ORDER BY id;     -- 想要顺序,就明确说出来
