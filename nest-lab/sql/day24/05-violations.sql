-- Day 24 · 05:逐条违反约束,看数据库怎么拒绝
-- VERBOSITY verbose 会把 SQLSTATE 错误码、表名、约束名都打出来 —— 这就是驱动(Day 27)拿到的信息
-- (最后的 LOCATION 是 PostgreSQL 源码里报错的位置,可以忽略)
SET search_path = day24;
\set VERBOSITY verbose

-- 23502 not_null_violation:没给标题(Day 22 的表允许这样,现在不行了)
INSERT INTO tasks (title, owner_id) VALUES (NULL, 1);

-- 23505 unique_violation:同一个邮箱,只是大小写不同(Day 23 的表允许重复,现在不行了)
INSERT INTO users (email, display_name) VALUES ('ALICE@example.com', 'Alice 2号');

-- 23514 check_violation:标题全是空白 / 角色不在白名单里 / 截止时间早于创建时间
INSERT INTO tasks (title, owner_id) VALUES ('   ', 1);
INSERT INTO users (email, display_name, role) VALUES ('mallory@example.com', 'Mallory', 'superadmin');
INSERT INTO tasks (title, owner_id, due_at) VALUES ('穿越回去', 1, now() - interval '1 day');

-- 23503 foreign_key_violation:负责人不存在
INSERT INTO tasks (title, owner_id) VALUES ('没人负责', 999);

-- 以上每一条都没有写进去
SELECT (SELECT count(*) FROM users) AS 用户数, (SELECT count(*) FROM tasks) AS 任务数;
