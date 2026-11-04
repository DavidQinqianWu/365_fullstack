-- Day 23 · 07:故意反范式 —— 计数缓存
-- 用户列表页每行都要显示「他有几个任务」。每次都去 tasks 里数一遍嫌慢,于是在 users 上加一列存起来。
-- 代价:这个数要自己维护。下面演示「忘了维护」时会发生什么(今天不实现触发器)。
SET search_path = day23;

ALTER TABLE users ADD COLUMN tasks_count integer;
UPDATE users u SET tasks_count = (SELECT count(*) FROM tasks t WHERE t.owner_id = u.id);
SELECT id, name, tasks_count FROM users ORDER BY id;

-- 新加一个 Bob 的任务,但写代码的人忘了顺手把 tasks_count + 1
INSERT INTO tasks (id, title, done, owner_id) VALUES (5, '给自行车打气', false, (SELECT id FROM users WHERE name = 'Bob'));

-- 缓存和真相对不上了
SELECT u.id, u.name, u.tasks_count AS 缓存的数,
       (SELECT count(*) FROM tasks t WHERE t.owner_id = u.id) AS 真实的数
FROM users u
ORDER BY u.id;

-- 一种补救:定期校正(把真相重新算一遍写回去)
UPDATE users u SET tasks_count = (SELECT count(*) FROM tasks t WHERE t.owner_id = u.id)
WHERE tasks_count IS DISTINCT FROM (SELECT count(*) FROM tasks t WHERE t.owner_id = u.id);
SELECT id, name, tasks_count FROM users ORDER BY id;

-- 恢复成 05 结束时的样子,方便重复运行
DELETE FROM tasks WHERE id = 5;
ALTER TABLE users DROP COLUMN tasks_count;
