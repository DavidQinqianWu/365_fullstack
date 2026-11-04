-- Day 24 · 03:UUID 主键 —— v4(完全随机)vs v7(时间在前,大致有序)
SET search_path = day24;

-- v4:PostgreSQL 13 起内置
SELECT gen_random_uuid() AS v4 FROM generate_series(1, 3);

-- v7:PostgreSQL 18 才内置 uuidv7();16 里没有
SELECT uuidv7();

-- 16 下的替代之一:用一个 SQL 函数自己拼(本课程环境实测可用)。
-- UUIDv7 的 128 位从左到右:48 位毫秒时间戳 | 4 位版本号 7 | 12 位 | 2 位变体 | 62 位随机。
-- 中间那 12 位这里填「毫秒以下的那一小段时间」,让同一毫秒里生成的也尽量有序(RFC 9562 允许的做法之一);
-- 变体位和最后的随机部分,直接借一个 v4 的后半段。
-- (另外两种办法:在应用层生成,比如 Node 的 uuid 包 v7();或者装第三方扩展 pg_uuidv7 —— 本课程环境没装,未实测)
CREATE OR REPLACE FUNCTION uuid_v7() RETURNS uuid
LANGUAGE sql VOLATILE AS $$
  WITH t AS (SELECT extract(epoch FROM clock_timestamp()) * 1000 AS ms)
  SELECT (lpad(to_hex(floor(ms)::bigint), 12, '0')                        -- 48 位毫秒时间戳
          || '7'                                                          -- 版本号
          || lpad(to_hex(floor((ms - floor(ms)) * 4096)::int), 3, '0')    -- 12 位:毫秒以下的时间
          || substr(replace(gen_random_uuid()::text, '-', ''), 17))::uuid -- 变体 + 随机
  FROM t
$$;

-- 每隔 2 毫秒生成一个,看看它们是不是按时间排好的;第 15 个字符是版本号
DROP TABLE IF EXISTS uuid_samples, pk_bigint, pk_uuid_v4, pk_uuid_v7;
CREATE TABLE uuid_samples (n integer, v4 uuid, v7 uuid);
DO $$
BEGIN
  FOR i IN 1..5 LOOP
    INSERT INTO uuid_samples VALUES (i, gen_random_uuid(), uuid_v7());
    PERFORM pg_sleep(0.002);
  END LOOP;
END $$;
SELECT n, v4, v7, substr(v7::text, 15, 1) AS v7的版本号 FROM uuid_samples ORDER BY n;
SELECT string_agg(n::text, ', ' ORDER BY v4) AS 按v4排序后的生成顺序,
       string_agg(n::text, ', ' ORDER BY v7) AS 按v7排序后的生成顺序
FROM uuid_samples;

-- 小规模插入对比(20 万行,只看量级;真正的测量方法 Week 5 讲)
-- 先把 id 生成好放进临时表,再按生成顺序插入:这样计时的是「往主键索引里插」,不是「生成 UUID 的函数有多快」
CREATE TEMP TABLE ids AS
SELECT n, gen_random_uuid() AS v4, uuid_v7() AS v7 FROM generate_series(1, 200000) AS n;
CREATE TABLE pk_bigint  (id bigint PRIMARY KEY, payload text);
CREATE TABLE pk_uuid_v4 (id uuid PRIMARY KEY, payload text);
CREATE TABLE pk_uuid_v7 (id uuid PRIMARY KEY, payload text);
\timing on
INSERT INTO pk_bigint  SELECT n,  'x' FROM ids ORDER BY n;
INSERT INTO pk_uuid_v4 SELECT v4, 'x' FROM ids ORDER BY n;
INSERT INTO pk_uuid_v7 SELECT v7, 'x' FROM ids ORDER BY n;
\timing off
-- 主键索引有多大(随机插入会让索引页频繁分裂,留下很多半空的页;uuid 本身 16 字节,bigint 8 字节)
SELECT relname AS 主键索引, pg_size_pretty(pg_relation_size(oid)) AS 大小
FROM pg_class
WHERE relname IN ('pk_bigint_pkey', 'pk_uuid_v4_pkey', 'pk_uuid_v7_pkey')
ORDER BY relname;
