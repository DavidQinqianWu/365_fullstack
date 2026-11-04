-- Day 33 · 01:准备数据(独立的 schema day33;重跑会整个删掉重建)
-- tasks 100 万行,这次标题像真的待办:一半英文("Fix invoice export #123")、一半中文("修复发票导出 #124",中文之间没有空格);
--   约 0.1% 的标题带「(加急)」,约 0.1% 带「 urgent」—— 少见的词,用来看索引在「选择性高」时的效果。
-- tags text[]:每个任务 1–2 个标签;meta jsonb:优先级、来源,约 1% 带 due(截止日)。
-- 一开始只有主键。每个实验文件自己建索引、最后删掉。
\timing on
SET client_min_messages = warning;
-- ① 扩展:pg_trgm(三元组)、btree_gin。它们是「受信任的扩展」(trusted),数据库的 owner 或有 CREATE 权限的用户就能建,
--    不需要超级用户;对不受信任的扩展,要用超级用户建(Docker 镜像里 POSTGRES_USER 就是超级用户)。扩展建在 public 里,整个库共用。
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA public;
SELECT extname AS 扩展, extversion AS 版本, extnamespace::regnamespace AS 在哪个_schema FROM pg_extension WHERE extname IN ('pg_trgm', 'btree_gin') ORDER BY 1;

DROP SCHEMA IF EXISTS day33 CASCADE;
CREATE SCHEMA day33;
SET search_path = day33, public;   -- public 要放进来:pg_trgm 的函数和操作符类在 public 里

CREATE TABLE tasks (
  id         bigint GENERATED ALWAYS AS IDENTITY,
  owner_id   bigint NOT NULL,
  title      text NOT NULL,
  done       boolean NOT NULL,
  created_at timestamptz NOT NULL,
  tags       text[] NOT NULL,
  meta       jsonb NOT NULL
);
SELECT setseed(0.33);
INSERT INTO tasks (owner_id, title, done, created_at, tags, meta)
WITH g AS (
  SELECT n, random() AS r1, random() AS r2, random() AS r3, random() AS r4, random() AS r5, random() AS r6, random() AS r7
  FROM generate_series(1, 1000000) AS n
)
SELECT 1 + floor(9999 * power(r1, 4))::bigint,
       CASE WHEN r2 < 0.5
         THEN (ARRAY['Fix', 'Write', 'Review', 'Deploy', 'Update', 'Refactor', 'Test', 'Design', 'Migrate', 'Document'])[1 + floor(r3 * 10)::int] || ' ' ||
              (ARRAY['login page', 'payment API', 'user report', 'search box', 'invoice export', 'dashboard chart', 'email template', 'mobile layout', 'cache layer', 'database index'])[1 + floor(r4 * 10)::int]
         ELSE (ARRAY['修复', '编写', '评审', '部署', '更新', '重构', '测试', '设计', '迁移', '整理'])[1 + floor(r3 * 10)::int] ||
              (ARRAY['登录页', '支付接口', '用户报表', '搜索框', '发票导出', '仪表盘图表', '邮件模板', '移动端布局', '缓存层', '数据库索引'])[1 + floor(r4 * 10)::int]
       END
       || CASE WHEN r5 < 0.001 THEN '(加急)' WHEN r5 < 0.002 THEN ' urgent' ELSE '' END
       || ' #' || n,
       r6 < 0.9,
       timestamptz '2024-01-01 00:00+00' + n * interval '1 minute' + r7 * interval '30 seconds',
       ARRAY[(ARRAY['backend', 'frontend', 'bug', 'feature', 'docs', 'ops', 'design', 'test'])[1 + floor(r3 * 8)::int]]
         || CASE WHEN r5 < 0.003 THEN ARRAY['security'] WHEN r4 < 0.3 THEN ARRAY['perf'] ELSE '{}'::text[] END,
       jsonb_build_object('priority', (ARRAY['low', 'normal', 'high'])[1 + floor(r6 * 3)::int],
                          'source', (ARRAY['web', 'email', 'api', 'import'])[1 + floor(r7 * 4)::int])
         || CASE WHEN r2 < 0.01 THEN jsonb_build_object('due', '2025-12-31') ELSE '{}'::jsonb END
FROM g;
ALTER TABLE tasks ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);
\timing off
VACUUM ANALYZE tasks;

SELECT relname AS 表或索引, pg_size_pretty(pg_relation_size(oid)) AS 大小
FROM pg_class WHERE relnamespace = 'day33'::regnamespace AND relkind IN ('r', 'i') ORDER BY relname;
SELECT id, title, tags, meta FROM tasks WHERE id IN (1, 2, 3, 4) ORDER BY id;
SELECT count(*) FILTER (WHERE title LIKE '%(加急)%') AS "(加急)", count(*) FILTER (WHERE title LIKE '% urgent%') AS urgent,
       count(*) FILTER (WHERE title LIKE '%invoice%') AS invoice, count(*) FILTER (WHERE title LIKE '%发票导出%') AS 发票导出,
       count(*) FILTER (WHERE tags @> ARRAY['security']) AS "tag security", count(*) FILTER (WHERE meta ? 'due') AS "有 due"
FROM tasks;
