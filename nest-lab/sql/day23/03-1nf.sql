-- Day 23 · 03:第一范式(1NF)—— 每个格子里只放一个值,没有重复的列组
--   · tag1/tag2/tag3 这组重复的列 → 改成「一个标签一行」
--   · checklist 这个拼出来的字符串 → 拆到单独的表,一个清单项一行
-- 数据用 INSERT … SELECT 从宽表搬过来(unnest / string_to_array / split_part 是 PG 的数组与字符串函数,Day 26 再细讲)
SET search_path = day23;
DROP TABLE IF EXISTS tasks_1nf, checklist_items_1nf;

-- 一行 = 「某个任务的某个标签」;主键是 (task_id, tag) 两列合起来
CREATE TABLE tasks_1nf (
  task_id     integer,
  tag         text,
  title       text,
  done        boolean,
  owner_email text,
  owner_name  text,
  PRIMARY KEY (task_id, tag)
);
INSERT INTO tasks_1nf (task_id, tag, title, done, owner_email, owner_name)
SELECT w.task_id, t.tag, w.title, w.done, w.owner_email, w.owner_name
FROM tasks_wide w
CROSS JOIN LATERAL unnest(ARRAY[w.tag1, w.tag2, w.tag3]) AS t(tag)
WHERE t.tag IS NOT NULL;

-- 一行 = 一个清单项;主键是 (task_id, position)
CREATE TABLE checklist_items_1nf (
  task_id  integer,
  position integer,
  text     text,
  done     boolean,
  PRIMARY KEY (task_id, position)
);
INSERT INTO checklist_items_1nf (task_id, position, text, done)
SELECT w.task_id, item.n, split_part(item.s, ':', 1), split_part(item.s, ':', 2) = 't'
FROM tasks_wide w
CROSS JOIN LATERAL unnest(string_to_array(w.checklist, ',')) WITH ORDINALITY AS item(s, n);

SELECT * FROM tasks_1nf ORDER BY task_id, tag;
SELECT * FROM checklist_items_1nf ORDER BY task_id, position;

-- 1NF 之后,「带 urgent 的任务」只要问一列;「牛奶完成了没有」也能直接查
SELECT task_id, title FROM tasks_1nf WHERE tag = 'urgent' ORDER BY task_id;
SELECT task_id, text, done FROM checklist_items_1nf WHERE text = '牛奶';

-- 但新问题来了:
-- ① title 只依赖 task_id(主键的一部分),却随着标签数重复存了好几份:改标题要改好几行
SELECT task_id, count(*) AS 这个标题存了几份 FROM tasks_1nf GROUP BY task_id ORDER BY task_id;
-- ② 一个还没有标签的新任务,根本放不进来:tag 是主键的一部分,不能为空
BEGIN;
INSERT INTO tasks_1nf (task_id, tag, title, owner_email, owner_name) VALUES (5, NULL, '还没想好标签', 'bob@example.com', 'Bob');
ROLLBACK;
