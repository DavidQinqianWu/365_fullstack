-- Day 25 · 05:聚合 —— 先分堆,再在每一堆里数 / 加 / 求平均
SET search_path = day25;

-- COUNT(*) 数行;COUNT(列) 只数这一列不是 NULL 的行;SUM / AVG 也会跳过 NULL
SELECT count(*)                AS 行数,
       count(estimate_minutes) AS 填了预估的行数,
       sum(estimate_minutes)   AS 总和,
       avg(estimate_minutes)   AS 平均,
       min(estimate_minutes)   AS 最少,
       max(estimate_minutes)   AS 最多
FROM tasks;

-- GROUP BY 的规矩:SELECT 里没被聚合的列,必须出现在 GROUP BY 里
SELECT u.display_name, u.email, count(*) AS 任务数
FROM users u JOIN tasks t ON t.owner_id = u.id
GROUP BY u.display_name;
-- 按主键分组就可以:知道 u.id 就能确定这一行的所有列(Day 23 的函数依赖),PostgreSQL 认这个
SELECT u.display_name, u.email, count(*) AS 任务数
FROM users u JOIN tasks t ON t.owner_id = u.id
GROUP BY u.id
ORDER BY u.id;

-- WHERE 在分组之前过滤行;HAVING 在分组之后过滤「堆」
-- 「未完成任务超过 1 个的用户」
SELECT u.display_name, count(*) AS 未完成数
FROM users u JOIN tasks t ON t.owner_id = u.id
WHERE t.done = false            -- 先把已完成的行扔掉
GROUP BY u.id
HAVING count(*) > 1             -- 再把「堆」里不到 2 个的扔掉
ORDER BY u.id;
-- 把分组后的条件写进 WHERE 会怎样
SELECT u.display_name, count(*) FROM users u JOIN tasks t ON t.owner_id = u.id
WHERE count(*) > 1 GROUP BY u.id;

-- FILTER:同一堆里按不同条件各数一次 —— 一行算出已完成 / 未完成
SELECT u.display_name,
       count(t.id)                              AS 全部,
       count(t.id) FILTER (WHERE t.done)        AS 已完成,
       count(t.id) FILTER (WHERE NOT t.done)    AS 未完成
FROM users u
LEFT JOIN tasks t ON t.owner_id = u.id
GROUP BY u.id
ORDER BY u.id;

-- string_agg / array_agg:把一堆值折叠成一个字符串 / 数组(Day 23 用过)
SELECT t.title,
       string_agg(g.name, ', ' ORDER BY g.name) AS 标签,
       array_agg(g.name ORDER BY g.name)        AS 标签数组
FROM tasks t
JOIN task_tags tt ON tt.task_id = t.id
JOIN tags g ON g.id = tt.tag_id
GROUP BY t.id
ORDER BY t.id;
