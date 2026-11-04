-- Day 30 · 07b:统计信息过期时的计划 → ANALYZE → 再看一次
SET search_path = day30;
SET max_parallel_workers_per_gather = 0;

-- 优化器手里的「印象」:上次 ANALYZE 时这张表有多少行、42 号占多少
SELECT reltuples AS 以为有几行, relpages AS 以为有几页 FROM pg_class WHERE oid = 'imports'::regclass;
SELECT count(*) AS 实际有几行 FROM imports;

-- 「42 号用户的导入记录,按套餐统计」
EXPLAIN (ANALYZE) SELECT u.plan, count(*) FROM imports i JOIN users u ON u.id = i.owner_id WHERE i.owner_id = 42 GROUP BY u.plan;

ANALYZE imports;
SELECT reltuples AS 以为有几行 FROM pg_class WHERE oid = 'imports'::regclass;
SELECT most_common_vals AS 最常见的值, most_common_freqs AS 占比
FROM pg_stats WHERE schemaname = 'day30' AND tablename = 'imports' AND attname = 'owner_id';
EXPLAIN (ANALYZE) SELECT u.plan, count(*) FROM imports i JOIN users u ON u.id = i.owner_id WHERE i.owner_id = 42 GROUP BY u.plan;

-- 统计信息里还有什么:不同值有几个、最常见的值、分桶边界(直方图)
SELECT attname AS 列, n_distinct,
       (most_common_vals::text::text[])[1:5] AS 最常见的前5个值,
       most_common_freqs[1:5] AS 它们的占比,
       array_length(most_common_vals::text::text[], 1) AS 一共记了几个常见值,
       array_length(histogram_bounds::text::text[], 1) AS 直方图边界数
FROM pg_stats WHERE schemaname = 'day30' AND tablename = 'tasks' AND attname IN ('owner_id', 'done')
ORDER BY attname;

-- 两列强相关时:优化器默认认为各列互相独立,把两个条件的比例相乘 → 估少了
DROP TABLE IF EXISTS cities;
CREATE TABLE cities (city text, country text);
INSERT INTO cities SELECT 'city-' || (n % 100), 'country-' || (n % 100) FROM generate_series(1, 100000) n;   -- 城市决定了国家
ANALYZE cities;
EXPLAIN (ANALYZE) SELECT * FROM cities WHERE city = 'city-7' AND country = 'country-7';
CREATE STATISTICS cities_dep (dependencies) ON city, country FROM cities;   -- 告诉优化器:这两列有依赖关系
ANALYZE cities;
EXPLAIN (ANALYZE) SELECT * FROM cities WHERE city = 'city-7' AND country = 'country-7';
