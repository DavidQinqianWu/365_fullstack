-- Day 29 · 04:建索引 —— 为 ① ② ③ 各准备一个「按某一列排好的卡片盒」
SET search_path = day29;
\timing on
ALTER TABLE tasks ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);   -- 主键会自动建一个 B-tree 唯一索引
CREATE INDEX tasks_owner_id_idx ON tasks (owner_id);
CREATE INDEX tasks_title_idx ON tasks (title);
\timing off
\d tasks
SELECT relname AS 名字, pg_size_pretty(pg_relation_size(oid)) AS 大小
FROM pg_class
WHERE relname IN ('tasks', 'tasks_pkey', 'tasks_owner_id_idx', 'tasks_title_idx') AND relnamespace = 'day29'::regnamespace
ORDER BY relname;
