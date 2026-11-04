-- Day 38 · 01:准备数据(独立的 schema day38;重跑会整个删掉重建)
--   items:3 行,看行版本(xmin / xmax / ctid)
--   bloat:20 万行,看表膨胀与 VACUUM / VACUUM FULL
--   av_demo:把 autovacuum 阈值调小,看它自己出现
--   longtx:长事务挡住清理
-- 除 av_demo 外,都关掉了这张表自己的 autovacuum(只在表上设置,不改全局配置),免得它中途插进来打乱实验。
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS day38 CASCADE;
CREATE SCHEMA day38;
SET search_path = day38;

CREATE TABLE items (id int PRIMARY KEY, v int NOT NULL, note text NOT NULL) WITH (autovacuum_enabled = false);
INSERT INTO items VALUES (1, 10, '第一行'), (2, 20, '第二行'), (3, 30, '第三行');

CREATE TABLE bloat (id int PRIMARY KEY, v int NOT NULL, note text NOT NULL) WITH (autovacuum_enabled = false);
INSERT INTO bloat SELECT g, 0, repeat('x', 40) FROM generate_series(1, 200000) AS g;

-- 这张表的 autovacuum 开着,但阈值调得很小:死元组超过 50 + 0 × 行数 = 50 行就该清理
CREATE TABLE av_demo (id int PRIMARY KEY, v int NOT NULL)
  WITH (autovacuum_vacuum_threshold = 50, autovacuum_vacuum_scale_factor = 0, autovacuum_analyze_threshold = 50, autovacuum_analyze_scale_factor = 0);
INSERT INTO av_demo SELECT g, 0 FROM generate_series(1, 1000) AS g;

CREATE TABLE longtx (id int PRIMARY KEY, v int NOT NULL) WITH (autovacuum_enabled = false);
INSERT INTO longtx SELECT g, 0 FROM generate_series(1, 10000) AS g;

VACUUM ANALYZE items;
VACUUM ANALYZE bloat;
VACUUM ANALYZE longtx;
SELECT relname AS 表, reloptions AS 选项 FROM pg_class WHERE relnamespace = 'day38'::regnamespace AND relkind = 'r' ORDER BY 1;
