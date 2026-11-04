-- Day 25 · 01:准备数据(独立的 schema day25,不碰 day23 / day24)
-- 表结构沿用 Day 24 的 3NF 设计(约束从简),数据在 Day 24 的基础上补了几样,让查询更有意思:
--   · Carol:一个任务都没有的用户
--   · 任务 5「写周报」:没有任何标签,预估时间也没填(NULL)
--   · tasks.estimate_minutes:预估要花几分钟,用来做 SUM / AVG
--   · employees:有「经理」关系的员工表,用来演示自连接和递归
SET client_min_messages = warning;   -- 重跑时不打印「顺带删掉了哪些表」的提示
DROP SCHEMA IF EXISTS day25 CASCADE;
CREATE SCHEMA day25;
SET search_path = day25;

CREATE TABLE users (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email        text NOT NULL UNIQUE,
  display_name text NOT NULL
);
CREATE TABLE tasks (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title            text NOT NULL,
  done             boolean NOT NULL DEFAULT false,
  owner_id         bigint NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  estimate_minutes integer CHECK (estimate_minutes > 0)    -- 可以不填
);
CREATE TABLE checklist_items (
  task_id  bigint NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 1),
  text     text NOT NULL,
  done     boolean NOT NULL DEFAULT false,
  PRIMARY KEY (task_id, position)
);
CREATE TABLE tags (
  id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE
);
CREATE TABLE task_tags (
  task_id bigint NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  tag_id  bigint NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);
CREATE TABLE employees (
  id         bigint PRIMARY KEY,
  name       text NOT NULL,
  manager_id bigint REFERENCES employees (id)      -- 指向同一张表:我的经理也是一名员工;老板没有经理(NULL)
);

INSERT INTO users (email, display_name) VALUES
  ('alice@example.com', 'Alice'), ('bob@example.com', 'Bob'), ('carol@example.com', 'Carol');
INSERT INTO tasks (title, done, owner_id, estimate_minutes) VALUES
  ('学 psql',     false, 1, 30),
  ('建第一张表',  true,  1, 20),
  ('买菜',        false, 1, 40),
  ('修自行车',    false, 2, 60),
  ('写周报',      true,  2, NULL);
INSERT INTO checklist_items (task_id, position, text, done) VALUES
  (1, 1, '装 PG', true), (1, 2, '连上 psql', true), (2, 1, '写 CREATE TABLE', true),
  (3, 1, '鸡蛋', false), (3, 2, '牛奶', false), (3, 3, '面包', true);
INSERT INTO tags (name) VALUES ('home'), ('learning'), ('urgent');
INSERT INTO task_tags VALUES (1, 2), (1, 3), (2, 2), (3, 1), (3, 3), (4, 1);
INSERT INTO employees VALUES
  (1, '老板', NULL),
  (2, '技术总监', 1), (3, '运营总监', 1),
  (4, '后端组长', 2), (5, '前端组长', 2),
  (6, '后端工程师小王', 4), (7, '后端工程师小李', 4), (8, '店长小周', 3);

SELECT id, display_name FROM users ORDER BY id;
SELECT id, title, done, owner_id, estimate_minutes FROM tasks ORDER BY id;
SELECT id, name, manager_id FROM employees ORDER BY id;
