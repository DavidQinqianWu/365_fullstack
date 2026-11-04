-- Day 26 · 05:RETURNING —— 写完当场拿回结果,不用再查一次
-- 每个实验都在事务里,做完回滚
SET search_path = day26;
SET TIME ZONE 'UTC';
BEGIN;

-- POST /tasks:拿回数据库生成的 id 和默认值(Day 27 用它拼 201 + Location)
INSERT INTO tasks (title, owner_id) VALUES ('学 RETURNING', 1)
RETURNING id, title, done, created_at IS NOT NULL AS 有创建时间;

-- PATCH /tasks/3:拿回更新后的整行(Day 27 直接拿它返回给调用方)
UPDATE tasks SET done = true WHERE id = 3
RETURNING id, title, done;

-- PATCH /tasks/999:没有这一行 → RETURNING 0 行 → 404
UPDATE tasks SET done = true WHERE id = 999
RETURNING id, title, done;

-- DELETE /tasks/5:拿回被删掉的是谁;再删一次就是 0 行
DELETE FROM tasks WHERE id = 5 RETURNING id, title;
DELETE FROM tasks WHERE id = 5 RETURNING id, title;

ROLLBACK;
