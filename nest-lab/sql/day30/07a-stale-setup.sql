-- Day 30 · 07a:制造一次「统计信息过期」
-- imports 表关掉了 autovacuum(它平时会在后台自动 ANALYZE,Week 6 讲);先放 1000 行、收集一次统计,
-- 再一次性导入 50 万行、全部属于 42 号用户 —— 优化器还以为 42 号只有 1 行
SET search_path = day30;
SET client_min_messages = warning;
DROP TABLE IF EXISTS imports;
CREATE TABLE imports (
  id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id bigint NOT NULL,
  payload  text
) WITH (autovacuum_enabled = false);
CREATE INDEX imports_owner_id_idx ON imports (owner_id);
INSERT INTO imports (owner_id, payload) SELECT 1 + n % 1000, '日常' FROM generate_series(1, 1000) n;
ANALYZE imports;
INSERT INTO imports (owner_id, payload) SELECT 42, '批量导入' FROM generate_series(1, 500000);
