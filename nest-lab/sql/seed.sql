-- nest-lab 的开发用种子数据(Day 27)。和内存版 TASKS_SEED 一样的两条,再加一条带清单的
SET search_path = :"schema";
INSERT INTO tasks (title, done) VALUES
  ('跑通 nest new', true),
  ('看懂 Module / Controller / Provider', false),
  ('把 nest-lab 接上 PostgreSQL', false);
INSERT INTO checklist_items (task_id, position, text, done) VALUES
  (3, 1, '装 pg 驱动', true),
  (3, 2, '写 PgTasksRepository', false),
  (3, 3, '让 e2e 在 PG 上也通过', false);
SELECT count(*) AS 任务数 FROM tasks;
