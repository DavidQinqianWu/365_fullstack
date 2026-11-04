-- Day 24 · 06:ON DELETE —— 被指向的那一行被删掉时,指向它的行怎么办
-- 每个实验都包在 BEGIN … ROLLBACK 里,做完就撤销。
SET search_path = day24;
\set VERBOSITY default

-- CASCADE:删掉任务 3,它的 3 个清单项和 2 个标签对照行一起删(Day 23 里这一步会报外键错误)
BEGIN;
SELECT (SELECT count(*) FROM checklist_items WHERE task_id = 3) AS 清单项, (SELECT count(*) FROM task_tags WHERE task_id = 3) AS 标签对照;
DELETE FROM tasks WHERE id = 3;
SELECT (SELECT count(*) FROM checklist_items WHERE task_id = 3) AS 清单项, (SELECT count(*) FROM task_tags WHERE task_id = 3) AS 标签对照;
ROLLBACK;

-- CASCADE 的另一头:删掉标签 urgent,只删对照行,任务本身不受影响
BEGIN;
DELETE FROM tags WHERE name = 'urgent';
SELECT t.id, t.title, (SELECT count(*) FROM task_tags tt WHERE tt.task_id = t.id) AS 还剩几个标签 FROM tasks t ORDER BY t.id;
ROLLBACK;

-- RESTRICT:Bob 还有任务,不许删 Bob
DELETE FROM users WHERE display_name = 'Bob';

-- 如果业务规定「用户注销后,他的任务保留但变成无人负责」,就该用 SET NULL。
-- 在事务里临时把外键换掉试一下(PostgreSQL 的建表 / 改表语句也能回滚)
BEGIN;
ALTER TABLE tasks ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE tasks DROP CONSTRAINT tasks_owner_id_fkey,
  ADD CONSTRAINT tasks_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE SET NULL;
DELETE FROM users WHERE display_name = 'Bob';
SELECT id, title, owner_id FROM tasks ORDER BY id;
ROLLBACK;

-- 回滚之后,外键还是原来的 RESTRICT
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'tasks_owner_id_fkey' AND connamespace = 'day24'::regnamespace;
