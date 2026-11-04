-- Day 24 · 02:integer 会用完
SET search_path = day24;

SELECT 2147483647::integer       AS integer_最大值,
       9223372036854775807::bigint AS bigint_最大值;
SELECT 2147483647::integer + 1;            -- 再加 1 就溢出

-- 一张「快用完了」的表:让序列从 2147483646 开始发号
DROP TABLE IF EXISTS t_almost_full;
CREATE TABLE t_almost_full (id integer GENERATED ALWAYS AS IDENTITY (START WITH 2147483646) PRIMARY KEY, name text);
INSERT INTO t_almost_full (name) VALUES ('倒数第二个号');
INSERT INTO t_almost_full (name) VALUES ('最后一个号');
INSERT INTO t_almost_full (name) VALUES ('没有号了');      -- 从这一刻起,这张表再也写不进新行
SELECT * FROM t_almost_full;
