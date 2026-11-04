-- Day 24 · 04:把 Day 23 的 3NF 设计稿加上主键和约束
-- 数据和 Day 23 的 3NF 一样(Alice 3 个任务、Bob 1 个),只是这次每条规矩都写进了表定义。
-- 每个约束都起了名字:违反时错误信息里会带上这个名字,Day 27 靠它判断「是哪条规矩被违反了」。
SET search_path = day24;
DROP TABLE IF EXISTS task_tags, checklist_items, tasks, tags, users;

CREATE TABLE users (
  id           bigint GENERATED ALWAYS AS IDENTITY,
  public_id    uuid NOT NULL DEFAULT uuid_v7(),          -- 对外暴露用的 id(见 03-uuid.sql)
  email        text NOT NULL,
  display_name text NOT NULL,
  role         text NOT NULL DEFAULT 'user',
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_public_id_key UNIQUE (public_id),
  CONSTRAINT users_role_check CHECK (role IN ('user', 'admin')),
  CONSTRAINT users_display_name_check CHECK (char_length(display_name) BETWEEN 1 AND 50)
);
-- 邮箱不区分大小写地唯一:对 lower(email) 建唯一索引(索引是什么、怎么工作,Week 5 讲)
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

CREATE TABLE tasks (
  id         bigint GENERATED ALWAYS AS IDENTITY,
  title      text NOT NULL,
  done       boolean NOT NULL DEFAULT false,
  owner_id   bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  due_at     timestamptz,                                  -- 截止时间,可以不填(timestamptz 的细节 Day 26)
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_title_check CHECK (char_length(btrim(title)) BETWEEN 1 AND 100),   -- 对应 Day 16 的 @IsNotBlank + @MaxLength(100)
  CONSTRAINT tasks_due_at_check CHECK (due_at IS NULL OR due_at >= created_at),
  -- 用户还有任务时,不许直接删用户(先转移或删掉他的任务)
  CONSTRAINT tasks_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE TABLE checklist_items (
  task_id  bigint NOT NULL,
  position integer NOT NULL,
  text     text NOT NULL,
  done     boolean NOT NULL DEFAULT false,
  CONSTRAINT checklist_items_pkey PRIMARY KEY (task_id, position),
  CONSTRAINT checklist_items_position_check CHECK (position >= 1),
  CONSTRAINT checklist_items_text_check CHECK (char_length(btrim(text)) BETWEEN 1 AND 100),
  -- 清单项离开任务没有意义:任务删了,它的清单项一起删
  CONSTRAINT checklist_items_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id   bigint GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL,
  CONSTRAINT tags_pkey PRIMARY KEY (id),
  CONSTRAINT tags_name_key UNIQUE (name)
);

CREATE TABLE task_tags (
  task_id bigint NOT NULL,
  tag_id  bigint NOT NULL,
  CONSTRAINT task_tags_pkey PRIMARY KEY (task_id, tag_id),
  -- 对照表的一行只是「这个任务贴了这个标签」:任务或标签任何一边没了,这一行就没意义了
  CONSTRAINT task_tags_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT task_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
);

-- 和 Day 23 一样的数据
INSERT INTO users (email, display_name) VALUES ('alice@example.com', 'Alice'), ('bob@example.com', 'Bob');
INSERT INTO tasks (title, done, owner_id) VALUES
  ('学 psql', false, 1), ('建第一张表', true, 1), ('买菜', false, 1), ('修自行车', false, 2);
INSERT INTO checklist_items (task_id, position, text, done) VALUES
  (1, 1, '装 PG', true), (1, 2, '连上 psql', true), (2, 1, '写 CREATE TABLE', true),
  (3, 1, '鸡蛋', false), (3, 2, '牛奶', false), (3, 3, '面包', true);
INSERT INTO tags (name) VALUES ('home'), ('learning'), ('urgent');
INSERT INTO task_tags VALUES (1, 2), (1, 3), (2, 2), (3, 1), (3, 3), (4, 1);

\d tasks
-- 这几张表上一共有哪些约束(c = CHECK,f = 外键,p = 主键,u = 唯一)
SELECT conrelid::regclass AS 表, conname AS 约束名, contype AS 类型
FROM pg_constraint
WHERE connamespace = 'day24'::regnamespace AND conrelid::regclass::text IN ('users', 'tasks', 'checklist_items', 'tags', 'task_tags')
ORDER BY 1, 3, 2;
