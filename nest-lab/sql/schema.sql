-- nest-lab 的数据库结构(Day 27)
-- 用法:npm run db:reset(= psql -v schema=app -f sql/schema.sql -f sql/seed.sql)
--       npm run db:reset -- --schema app_test   ← e2e:pg 用的独立 schema
-- ⚠️ 会先 DROP 整个 schema,里面的数据全部清空。正式的迁移工具(只增量改结构、不删数据)是 Week 9 的内容。
--
-- 约束沿用 Day 24 的设计(docs/er-diagram.md);checklist 按 Day 26 的决定放在子表。
-- users 今天不迁移(原因见 Day 27 讲义):它的结构会在 Week 10 做登录时大改。
\set ON_ERROR_STOP on
SET client_min_messages = warning;

-- Day 34:?q= 的子串搜索要用 pg_trgm(三元组,Day 33)。扩展装在 public 里、整个库共用,不受下面 DROP SCHEMA 影响。
-- 它是「受信任的扩展」:库的 owner(或有 CREATE 权限的用户)就能建;Docker 镜像的 POSTGRES_USER 是超级用户,也能建。
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

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
-- 外键 checklist_items.task_id 不用另建索引:主键 (task_id, position) 以它打头(Day 32)

-- ---------- Day 34:按负载挑着建的索引(证据、代价和「为什么不建别的」见 docs/query-tuning.md) ----------
-- ① ?sort=-createdAt / createdAt:第一页、深分页(配合 keysetCondition 的冗余范围条件)、
--    ?done=false&sort=-createdAt(按这个顺序扫、边扫边过滤,未完成约占 1/4,很快凑够一页)都用它。
--    -createdAt 补上 tie-breaker 后是 created_at DESC, id ASC(方向混合):倒着读这个索引,再对「时间相同的几行」做一次
--    很便宜的 Incremental Sort。没有按 Day 31 的建议声明成 (created_at DESC, id):新任务的 created_at 总是最大的,
--    DESC 索引里每次都插在最左边,页分裂只能对半分,实测 30 万行时 16 MB,ASC 只有 9 MB(见 docs/query-tuning.md)
CREATE INDEX tasks_created_at_id_idx ON tasks (created_at, id);
-- ② ?sort=title / -title:排序表达式是 title COLLATE "C"(Day 27),索引必须用同样的排序规则才能被用上;
--    顺带也能服务前缀 LIKE 'abc%'(Day 33)
CREATE INDEX tasks_title_c_id_idx ON tasks (title COLLATE "C", id);
-- ③ ?q=:title ILIKE '%…%' 的 trigram GIN(Day 33)。search_path 只有 :"schema",所以操作符类写全名 public.gin_trgm_ops
CREATE INDEX tasks_title_trgm_idx ON tasks USING gin (title public.gin_trgm_ops);
-- ④ 让 ANALYZE 给 title 多抽样(默认 100 → 1000)。优化器估算 ILIKE '%…%' 命中多少行,靠的是抽样;
--    默认值下同一份数据每次 ANALYZE 的估算能差几百倍(invoice 实际 1.5 万行,估出过 30 行),
--    估少了就会选「GIN 取出全部匹配行再排序」,常见词反而变慢。代价:ANALYZE 稍慢、统计信息占的空间大一些
ALTER TABLE tasks ALTER COLUMN title SET STATISTICS 1000;
