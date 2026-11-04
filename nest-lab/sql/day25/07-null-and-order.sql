-- Day 25 · 07:NULL 的三值逻辑,以及 SQL 的逻辑执行顺序
SET search_path = day25;
\pset null '(null)'

-- NULL 表示「不知道」。和「不知道」比较,结果还是「不知道」(NULL),而不是 true / false
SELECT NULL = NULL          AS "NULL = NULL",
       NULL <> 1            AS "NULL <> 1",
       NULL IS NULL         AS "NULL IS NULL",
       NULL IS DISTINCT FROM NULL AS "NULL IS DISTINCT FROM NULL",
       1 IS DISTINCT FROM NULL    AS "1 IS DISTINCT FROM NULL";

-- WHERE 只留下条件为 true 的行;「不知道」和 false 一样被扔掉 —— 于是「写周报」消失了
SELECT title, estimate_minutes FROM tasks WHERE estimate_minutes <> 30 ORDER BY id;
SELECT title, estimate_minutes FROM tasks WHERE estimate_minutes = 30 ORDER BY id;
-- 两个查询加起来 4 行,可表里有 5 行
SELECT count(*) AS 表里一共几行 FROM tasks;
-- 想把「不知道」也算进「不等于 30」:
SELECT title, estimate_minutes FROM tasks WHERE estimate_minutes IS DISTINCT FROM 30 ORDER BY id;
-- 找出没填的:不能写 = NULL
SELECT count(*) AS "用 = NULL 找到" FROM tasks WHERE estimate_minutes = NULL;
SELECT count(*) AS "用 IS NULL 找到" FROM tasks WHERE estimate_minutes IS NULL;
-- COALESCE:取第一个不是 NULL 的值,常用来给「不知道」一个显示用的默认值
SELECT title, coalesce(estimate_minutes::text, '未估算') AS 预估 FROM tasks ORDER BY id;

-- 逻辑执行顺序:FROM / JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
-- 所以 WHERE 里还不认识 SELECT 里起的别名……
SELECT title, estimate_minutes * 2 AS 翻倍 FROM tasks WHERE 翻倍 > 60;
-- ……ORDER BY 在 SELECT 之后,就认识
SELECT title, estimate_minutes * 2 AS 翻倍 FROM tasks ORDER BY 翻倍 DESC NULLS LAST LIMIT 2;
