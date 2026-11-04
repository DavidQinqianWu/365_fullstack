-- Day 29 · 06:建了索引 ≠ 一定会用
SET search_path = day29;
CREATE INDEX IF NOT EXISTS tasks_done_idx ON tasks (done);
ANALYZE tasks;

-- 优化器知道的「分布」:done 两种值各占多少(统计信息,Day 30 细讲)
SELECT most_common_vals AS 最常见的值, most_common_freqs AS 各自占比
FROM pg_stats WHERE schemaname = 'day29' AND tablename = 'tasks' AND attname = 'done';

-- 要 90% 的行:不如从头扫
EXPLAIN SELECT * FROM tasks WHERE done = true;
-- 要 10% 的行
EXPLAIN SELECT * FROM tasks WHERE done = false;
-- 同一个 owner_id 索引:普通用户(约 50 行)vs 1 号用户(约 10 万行)
EXPLAIN SELECT * FROM tasks WHERE owner_id = 5000;
EXPLAIN SELECT * FROM tasks WHERE owner_id = 1;

-- 小表:只有 10 行,有主键索引也不用
CREATE TABLE tiny (id integer PRIMARY KEY, name text);
INSERT INTO tiny SELECT n, 'n' || n FROM generate_series(1, 10) n;
ANALYZE tiny;
EXPLAIN SELECT * FROM tiny WHERE id = 5;

-- 强行不许全表扫描,看看用索引要多少代价(只为对比,别在生产里这样设)
SET enable_seqscan = off;
EXPLAIN SELECT * FROM tasks WHERE done = true;
RESET enable_seqscan;
