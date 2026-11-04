-- Day 26 · 07:数组 —— 一个格子里放一串值
SET search_path = day26;

-- 用数组存标签名(和 Day 23 的 task_tags 中间表对比)
CREATE TEMP TABLE tasks_arr AS
SELECT t.id, t.title, coalesce(array_agg(g.name ORDER BY g.name) FILTER (WHERE g.id IS NOT NULL), '{}') AS tag_names
FROM tasks t
LEFT JOIN task_tags tt ON tt.task_id = t.id
LEFT JOIN tags g ON g.id = tt.tag_id
GROUP BY t.id;
SELECT id, title, tag_names FROM tasks_arr ORDER BY id;

-- 查询很顺手:ANY(数组里有没有这个值)、@>(是否包含这几个值)
SELECT id, title FROM tasks_arr WHERE 'urgent' = ANY (tag_names) ORDER BY id;
SELECT id, title FROM tasks_arr WHERE tag_names @> ARRAY['learning', 'urgent'] ORDER BY id;

-- 但标签改名时:数组要改每一行;中间表只改 tags 的一行
UPDATE tasks_arr SET tag_names = array_replace(tag_names, 'learning', 'study') WHERE 'learning' = ANY (tag_names);
BEGIN;
UPDATE tags SET name = 'study' WHERE name = 'learning';
ROLLBACK;
-- 数组里的值也没有外键:写进一个根本不存在的标签,照样成功
UPDATE tasks_arr SET tag_names = array_append(tag_names, 'ugrent') WHERE id = 4 RETURNING id, tag_names;
