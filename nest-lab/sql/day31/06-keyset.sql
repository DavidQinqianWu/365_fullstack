-- Day 31 · 06:keyset 分页(Day 19 / 27)需要什么索引
-- 场景:按创建时间倒序翻页,已经翻到很后面(书签停在 2024-01-10、id 12960 —— 越早的任务越在后面)
SET search_path = day31;
SET max_parallel_workers_per_gather = 0;
DROP INDEX IF EXISTS tasks_created_id_idx;
DROP INDEX IF EXISTS tasks_created_desc_id_asc_idx;

-- A. 两列同方向(created_at DESC, id DESC):行值比较,一个索引条件直接跳到书签的位置
CREATE INDEX tasks_created_id_idx ON tasks (created_at, id);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT * FROM tasks
WHERE (created_at, id) < ('2024-01-10 00:00+00', 12960)
ORDER BY created_at DESC, id DESC LIMIT 21;
DROP INDEX tasks_created_id_idx;

-- B. 方向混合(created_at DESC, id ASC)—— nest-lab 的 ?sort=-createdAt 就是这样(Day 19 的 withTieBreaker 自动补 id 升序)
--    行值比较用不了,Day 27 展开成了 OR。索引按同样的混合方向建:
CREATE INDEX tasks_created_desc_id_asc_idx ON tasks (created_at DESC, id ASC);
-- B1. Day 27 的写法:只有 OR 条件
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT * FROM tasks
WHERE created_at < '2024-01-10 00:00+00' OR (created_at = '2024-01-10 00:00+00' AND id > 12960)
ORDER BY created_at DESC, id ASC LIMIT 21;
-- B2. 多加一个「冗余」的范围条件 created_at <= 书签:结果完全一样,但它能成为索引条件
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT * FROM tasks
WHERE created_at <= '2024-01-10 00:00+00'
  AND (created_at < '2024-01-10 00:00+00' OR (created_at = '2024-01-10 00:00+00' AND id > 12960))
ORDER BY created_at DESC, id ASC LIMIT 21;
-- 两种写法的结果一样吗?
SELECT
  (SELECT array_agg(id) FROM (SELECT id FROM tasks WHERE created_at < '2024-01-10 00:00+00' OR (created_at = '2024-01-10 00:00+00' AND id > 12960) ORDER BY created_at DESC, id ASC LIMIT 21) a)
  =
  (SELECT array_agg(id) FROM (SELECT id FROM tasks WHERE created_at <= '2024-01-10 00:00+00' AND (created_at < '2024-01-10 00:00+00' OR (created_at = '2024-01-10 00:00+00' AND id > 12960)) ORDER BY created_at DESC, id ASC LIMIT 21) b)
  AS 两种写法结果相同;
DROP INDEX tasks_created_desc_id_asc_idx;
