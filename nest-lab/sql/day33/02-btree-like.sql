-- Day 33 · 02:B-tree 能帮 LIKE 什么忙 —— 卡片按开头排序,查「开头是……」可以,查「中间有……」不行
-- 前缀查询 LIKE 'abc%' 能变成范围条件 title >= 'abc' AND title < 'abd',但前提是索引「按字节 / 码点」排序:
--   PostgreSQL 16 只认名字就叫 "C" / "POSIX" 的排序规则;本库是 C.UTF-8(实际也按码点排,但优化器不认),
--   官方 Docker 镜像默认的 en_US.utf8 更不行。这两种情况都要用 text_pattern_ops 或 COLLATE "C" 的索引。
SET search_path = day33, public;
SET max_parallel_workers_per_gather = 0;   -- 只为了计划好读
SET client_min_messages = warning;
DROP INDEX IF EXISTS tasks_title_idx;

\echo '=== ① 没有索引:nest-lab 的 ?q= 生成的就是这种 SQL'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, title FROM tasks WHERE title ILIKE '%urgent%';

CREATE INDEX tasks_title_idx ON tasks (title);
ANALYZE tasks;
SELECT datcollate AS 本库的排序规则 FROM pg_database WHERE datname = current_database();
\echo '=== ② 普通 B-tree (title):前缀查询 LIKE ''Fix invoice%''(约 5000 行,只占 0.5%)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, title FROM tasks WHERE title LIKE 'Fix invoice%';
DROP INDEX tasks_title_idx;

\echo '=== ③ 按字节比较的索引:text_pattern_ops'
CREATE INDEX tasks_title_pattern_idx ON tasks (title text_pattern_ops);
ANALYZE tasks;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, title FROM tasks WHERE title LIKE 'Fix invoice%';
\echo '--- 但它帮不了 ORDER BY title(排序要按列的排序规则,它是按字节排的)'
EXPLAIN (COSTS OFF) SELECT id, title FROM tasks ORDER BY title LIMIT 5;
\echo '--- 前后都有 %:LIKE ''%invoice%'''
EXPLAIN (COSTS OFF) SELECT id, title FROM tasks WHERE title LIKE '%invoice%';
\echo '--- 不分大小写的前缀:ILIKE ''fix invoice%'''
EXPLAIN (COSTS OFF) SELECT id, title FROM tasks WHERE title ILIKE 'fix invoice%';
DROP INDEX tasks_title_pattern_idx;

\echo '=== ④ 排序规则就是 "C" 的索引也可以(nest-lab 排序用的就是 title COLLATE "C",Day 27)'
CREATE INDEX tasks_title_c_idx ON tasks (title COLLATE "C");
ANALYZE tasks;
EXPLAIN (COSTS OFF) SELECT id, title FROM tasks WHERE title LIKE 'Fix invoice%';
EXPLAIN (COSTS OFF) SELECT id, title FROM tasks ORDER BY title COLLATE "C" LIMIT 5;
DROP INDEX tasks_title_c_idx;
