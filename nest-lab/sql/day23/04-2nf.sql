-- Day 23 · 04:第二范式(2NF)—— 不能只依赖主键的「一部分」
-- tasks_1nf 的主键是 (task_id, tag),可 title / done / owner_* 只要知道 task_id 就能确定 → 拆出去
SET search_path = day23;
DROP TABLE IF EXISTS tasks_2nf, task_tags_2nf;

CREATE TABLE tasks_2nf (
  task_id     integer PRIMARY KEY,
  title       text,
  done        boolean,
  owner_email text,
  owner_name  text
);
INSERT INTO tasks_2nf
SELECT DISTINCT task_id, title, done, owner_email, owner_name FROM tasks_1nf;
-- 宽表里有、但 tasks_1nf 里没有的任务(没有任何标签的),也要搬过来
INSERT INTO tasks_2nf
SELECT task_id, title, done, owner_email, owner_name FROM tasks_wide
WHERE task_id NOT IN (SELECT task_id FROM tasks_2nf);

CREATE TABLE task_tags_2nf (
  task_id integer,
  tag     text,
  PRIMARY KEY (task_id, tag)
);
INSERT INTO task_tags_2nf SELECT task_id, tag FROM tasks_1nf;

SELECT * FROM tasks_2nf ORDER BY task_id;
SELECT * FROM task_tags_2nf ORDER BY task_id, tag;

-- 1NF 的两个问题消失了:改标题只改一行;没有标签的任务也能放进来
BEGIN;
UPDATE tasks_2nf SET title = '学 psql(改名)' WHERE task_id = 1;
INSERT INTO tasks_2nf VALUES (5, '还没想好标签', false, 'bob@example.com', 'Bob');
ROLLBACK;

-- 但宽表的三类异常还在:负责人的名字和邮箱仍然跟着任务一份份重复
BEGIN;
UPDATE tasks_2nf SET owner_email = 'alice@new.example' WHERE owner_name = 'Alice';   -- 改一个人的邮箱,要改几行?
ROLLBACK;
BEGIN;
DELETE FROM tasks_2nf WHERE task_id = 4;
SELECT DISTINCT owner_name FROM tasks_2nf ORDER BY owner_name;                     -- Bob 又没了
ROLLBACK;
