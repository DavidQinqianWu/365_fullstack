-- nest-lab 的数据库结构(Day 27)
-- 用法:npm run db:reset(= psql -v schema=app -f sql/schema.sql -f sql/seed.sql)
--       npm run db:reset -- --schema app_test   ← e2e:pg 用的独立 schema
-- ⚠️ 会先 DROP 整个 schema,里面的数据全部清空。正式的迁移工具(只增量改结构、不删数据)是 Week 9 的内容。
--
-- 约束沿用 Day 24 的设计(docs/er-diagram.md);checklist 按 Day 26 的决定放在子表。
-- users 今天不迁移(原因见 Day 27 讲义):它的结构会在 Week 10 做登录时大改。
\set ON_ERROR_STOP on
SET client_min_messages = warning;

DROP SCHEMA IF EXISTS :"schema" CASCADE;
CREATE SCHEMA :"schema";
SET search_path = :"schema";

CREATE TABLE tasks (
  id         bigint GENERATED ALWAYS AS IDENTITY,
  title      text NOT NULL,
  done       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  -- 对应 Day 16 的 @IsNotBlank + @MaxLength(100):DTO 先拦,数据库兜底
  CONSTRAINT tasks_title_check CHECK (char_length(btrim(title)) BETWEEN 1 AND 100)
);

CREATE TABLE checklist_items (
  task_id  bigint NOT NULL,
  position integer NOT NULL,
  text     text NOT NULL,
  done     boolean NOT NULL DEFAULT false,
  CONSTRAINT checklist_items_pkey PRIMARY KEY (task_id, position),
  CONSTRAINT checklist_items_position_check CHECK (position >= 1),
  CONSTRAINT checklist_items_text_check CHECK (char_length(btrim(text)) BETWEEN 1 AND 100),
  CONSTRAINT checklist_items_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
);
