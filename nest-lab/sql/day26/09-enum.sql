-- Day 26 · 09:枚举 —— CHECK (… IN …) vs CREATE TYPE … AS ENUM(点到为止)
SET search_path = day26;
DROP TABLE IF EXISTS enum_demo;
DROP TYPE IF EXISTS task_status;
CREATE TYPE task_status AS ENUM ('todo', 'doing', 'done');
CREATE TABLE enum_demo (id integer PRIMARY KEY, status task_status NOT NULL);
INSERT INTO enum_demo VALUES (1, 'todo'), (2, 'done');
INSERT INTO enum_demo VALUES (3, 'archived');                  -- 不在枚举里
ALTER TYPE task_status ADD VALUE 'archived';                    -- 加一个值很容易
INSERT INTO enum_demo VALUES (3, 'archived');
SELECT * FROM enum_demo ORDER BY status;                        -- 按定义的顺序排序,不是按字母
ALTER TYPE task_status DROP VALUE 'doing';                      -- 删值:没有这个语法
