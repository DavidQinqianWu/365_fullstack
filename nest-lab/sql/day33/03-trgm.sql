-- Day 33 · 03:pg_trgm + GIN —— 书末的「关键词索引」,这里的关键词是每 3 个字符一组
SET search_path = day33, public;
SET max_parallel_workers_per_gather = 0;
SET client_min_messages = warning;
DROP INDEX IF EXISTS tasks_title_trgm_idx, tasks_owner_title_trgm_idx;

\echo '=== ① 三元组(trigram)长什么样'
SELECT show_trgm('invoice') AS "invoice 的三元组";
SELECT show_trgm('Fix invoice') AS "Fix invoice(大小写不分,按单词切)";
SELECT show_trgm('发票导出') AS "发票导出";
SELECT show_trgm('登录') AS "登录(2 个字,作为一个完整的词)";
\echo '--- LIKE 的模式里能抽出哪些三元组(查询时用的就是这些)'
SELECT show_trgm('urgent') AS "%urgent%";

\echo '=== ② 建 trigram GIN 索引,看看多大'
\timing on
CREATE INDEX tasks_title_trgm_idx ON tasks USING gin (title gin_trgm_ops);
\timing off
ANALYZE tasks;
SELECT pg_size_pretty(pg_relation_size('tasks')) AS 表, pg_size_pretty(pg_relation_size('tasks_title_trgm_idx')) AS "trigram GIN 索引",
       pg_size_pretty(sum(pg_column_size(title))) AS "title 列本身" FROM tasks;

\echo '=== ③ ILIKE ''%urgent%''(少见的词,约 1000 行)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, title FROM tasks WHERE title ILIKE '%urgent%';
\echo '=== ④ ILIKE ''%invoice%''(常见的词,约 5 万行)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, title FROM tasks WHERE title ILIKE '%invoice%';
\echo '=== ⑤ 中文 4 个字:LIKE ''%发票导出%'''
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, title FROM tasks WHERE title LIKE '%发票导出%';
\echo '=== ⑥ 中文 2 个字:LIKE ''%加急%''(抽不出三元组)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, title FROM tasks WHERE title LIKE '%加急%';
\echo '--- 同样的意思,带上括号凑够 3 个字符:LIKE ''%(加急)%'''
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, title FROM tasks WHERE title LIKE '%(加急)%';

\echo '=== ⑦ 模糊匹配:拼错了也能找到'
SELECT similarity('invoice', 'invoce') AS "similarity(invoice, invoce)",
       word_similarity('dashbord', 'Review dashboard chart #9') AS "word_similarity(dashbord, …dashboard…)",
       word_similarity('paymnet', 'Fix payment API #3') AS "word_similarity(paymnet, …payment…)";
SHOW pg_trgm.word_similarity_threshold;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT id, title FROM tasks WHERE 'dashbord' <% title     -- <%:word_similarity 超过阈值(默认 0.6)
ORDER BY word_similarity('dashbord', title) DESC, id LIMIT 3;
SELECT id, title, round(word_similarity('dashbord', title)::numeric, 2) AS 相似度
FROM tasks WHERE 'dashbord' <% title ORDER BY word_similarity('dashbord', title) DESC, id LIMIT 3;
\echo '--- 括号为什么能帮上忙:LIKE 模式里,紧挨着 % 的地方不知道是不是词的边界;括号是确定的边界'
SELECT show_trgm('加急') AS "加急 作为一个完整的词", show_trgm('(加急)') AS "(加急)";

\echo '=== ⑧ btree_gin:让普通列(owner_id)也能和三元组放进同一个 GIN 索引 —— 「某人的任务里搜关键词」'
DROP INDEX tasks_title_trgm_idx;
CREATE INDEX tasks_owner_title_trgm_idx ON tasks USING gin (owner_id, title gin_trgm_ops);
ANALYZE tasks;
\echo '--- owner_id = 2:2 是 integer,而 owner_id 是 bigint,btree_gin 的 int8 操作符类里没有「bigint = integer」,这个条件进不了索引'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, title FROM tasks WHERE owner_id = 2 AND title ILIKE '%invoice%';
\echo '--- owner_id = 2::bigint:类型对上了,两个条件都进了 Index Cond(pg 驱动传的参数会被推断成列的类型,不会踩这个坑)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, title FROM tasks WHERE owner_id = 2::bigint AND title ILIKE '%invoice%';
SELECT pg_size_pretty(pg_relation_size('tasks_owner_title_trgm_idx')) AS "(owner_id, title) 的 GIN";
DROP INDEX tasks_owner_title_trgm_idx;
