-- Day 26 · 01:准备数据(独立的 schema day26)
-- 在 Day 25 的数据上加了:任务的创建时间(用来排「最新」)、两个预估时长相同的任务(用来看并列名次)、
-- 用户的最后登录时间(UPSERT 用)。所有时间都写成带时区偏移的绝对时刻。
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS day26 CASCADE;
CREATE SCHEMA day26;
SET search_path = day26;
SET TIME ZONE 'UTC';   -- 让输出的时间都按世界时显示(第 08 个文件专门讲时区)

CREATE TABLE users (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text NOT NULL,
  display_name  text NOT NULL,
  last_login_at timestamptz,
  CONSTRAINT users_email_key UNIQUE (email)
);
CREATE TABLE tasks (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title            text NOT NULL,
  done             boolean NOT NULL DEFAULT false,
  owner_id         bigint NOT NULL REFERENCES users (id),
  estimate_minutes integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE checklist_items (
  task_id  bigint NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  position integer NOT NULL,
  text     text NOT NULL,
  done     boolean NOT NULL DEFAULT false,
  PRIMARY KEY (task_id, position)
);
CREATE TABLE tags (
  id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  CONSTRAINT tags_name_key UNIQUE (name)
);
CREATE TABLE task_tags (
  task_id bigint NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  tag_id  bigint NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

INSERT INTO users (email, display_name) VALUES
  ('alice@example.com', 'Alice'), ('bob@example.com', 'Bob'), ('carol@example.com', 'Carol');
INSERT INTO tasks (title, done, owner_id, estimate_minutes, created_at) VALUES
  ('学 psql',     false, 1, 30,   '2026-11-02 09:00+00'),
  ('建第一张表',  true,  1, 20,   '2026-11-02 14:00+00'),
  ('买菜',        false, 1, 40,   '2026-11-03 08:30+00'),
  ('修自行车',    false, 2, 60,   '2026-11-02 10:00+00'),
  ('写周报',      true,  2, NULL, '2026-11-04 17:00+00'),
  ('读 SQL 文档', false, 1, 30,   '2026-11-04 08:00+00');
INSERT INTO checklist_items (task_id, position, text, done) VALUES
  (1, 1, '装 PG', true), (1, 2, '连上 psql', true), (2, 1, '写 CREATE TABLE', true),
  (3, 1, '鸡蛋', false), (3, 2, '牛奶', false), (3, 3, '面包', true);
INSERT INTO tags (name) VALUES ('home'), ('learning'), ('urgent');
INSERT INTO task_tags VALUES (1, 2), (1, 3), (2, 2), (3, 1), (3, 3), (4, 1), (6, 2);

SELECT id, title, owner_id, estimate_minutes, created_at FROM tasks ORDER BY id;
