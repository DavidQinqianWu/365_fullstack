-- Day 33 · 04:全文搜索(tsvector / tsquery)—— 不再按字符切,而是按「词」切,还会把词还原成词根
SET search_path = day33, public;
SET max_parallel_workers_per_gather = 0;
SET client_min_messages = warning;
DROP INDEX IF EXISTS tasks_title_fts_idx, tasks_title_trgm_idx;

\echo '=== ① 分词 + 词干:english 配置会把 running → run、APIs → api,并扔掉 the 这种停用词'
SELECT to_tsvector('english', 'Running the payment APIs quickly') AS english,
       to_tsvector('simple',  'Running the payment APIs quickly') AS simple;
SELECT to_tsquery('english', 'runs') AS "查 runs", to_tsquery('english', 'deploying & invoices') AS "查 deploying & invoices";
SELECT to_tsvector('english', 'Running the payment APIs quickly') @@ to_tsquery('english', 'runs') AS "running 能匹配 runs 吗";

\echo '=== ② 中文:默认的分词器只认空格和标点,一整串汉字被当成一个「词」'
SELECT to_tsvector('simple', '修复发票导出(加急)') AS simple, to_tsvector('english', '修复发票导出') AS english;
SELECT to_tsvector('simple', '修复发票导出') @@ to_tsquery('simple', '发票') AS "能搜到「发票」吗",
       to_tsvector('simple', '修复 发票 导出') @@ to_tsquery('simple', '发票') AS "人工加空格之后呢";
SELECT count(*) AS 分词配置数, string_agg(cfgname, ' ' ORDER BY cfgname) AS "本库有的分词配置(没有中文)" FROM pg_ts_config;

\echo '=== ③ 给全文搜索建 GIN:对 to_tsvector(''english'', title) 这个表达式建(两个参数的形式才是 IMMUTABLE,Day 32)'
\timing on
CREATE INDEX tasks_title_fts_idx ON tasks USING gin (to_tsvector('english', title));
\timing off
ANALYZE tasks;
SELECT pg_size_pretty(pg_relation_size('tasks_title_fts_idx')) AS "全文搜索 GIN 索引";
\echo '--- 搜「deploying invoices」:用户输入的写法交给 websearch_to_tsquery(支持 "引号"、or、-排除)'
SELECT websearch_to_tsquery('english', 'deploying invoices') AS 转换后的查询;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT id, title FROM tasks WHERE to_tsvector('english', title) @@ websearch_to_tsquery('english', 'deploying invoices');
\echo '--- 按相关度排序(ts_rank):这里的标题很短,大部分分数一样,所以再按 id 排'
SELECT id, title, ts_rank(to_tsvector('english', title), q) AS 相关度
FROM tasks, websearch_to_tsquery('english', 'urgent invoice') AS q
WHERE to_tsvector('english', title) @@ q
ORDER BY 相关度 DESC, id LIMIT 3;

\echo '=== ④ trigram 和全文搜索的区别:搜 voice(invoice 的一部分)'
SELECT count(*) AS "trigram/ILIKE:标题里有 voice 这个子串" FROM tasks WHERE title ILIKE '%voice%';
SELECT count(*) AS "全文搜索:有 voice 这个词" FROM tasks WHERE to_tsvector('english', title) @@ to_tsquery('english', 'voice');
\echo '--- 反过来:搜 exports(复数)'
SELECT count(*) AS "ILIKE ''%exports%''" FROM tasks WHERE title ILIKE '%exports%';
SELECT count(*) AS "全文搜索 exports" FROM tasks WHERE to_tsvector('english', title) @@ to_tsquery('english', 'exports');

DROP INDEX tasks_title_fts_idx;
