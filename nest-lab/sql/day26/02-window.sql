-- Day 26 · 02:窗口函数 —— 每一行都留着,旁边多写一列「组内统计」
SET search_path = day26;
SET TIME ZONE 'UTC';

-- GROUP BY 把每个用户压成一行……
SELECT owner_id, count(*) AS 任务数 FROM tasks GROUP BY owner_id ORDER BY owner_id;
-- ……窗口函数不压:每个任务还是一行,旁边写上「这个用户一共几个任务」「这是他的第几个任务」
SELECT owner_id, title, created_at,
       count(*)     OVER (PARTITION BY owner_id)                          AS 他一共几个,
       row_number() OVER (PARTITION BY owner_id ORDER BY created_at)      AS 他的第几个
FROM tasks
ORDER BY owner_id, created_at;

-- 并列时三种排名的区别:按预估时长从长到短,「学 psql」和「读 SQL 文档」都是 30 分钟
SELECT title, estimate_minutes,
       row_number() OVER (ORDER BY estimate_minutes DESC NULLS LAST) AS row_number,
       rank()       OVER (ORDER BY estimate_minutes DESC NULLS LAST) AS rank,
       dense_rank() OVER (ORDER BY estimate_minutes DESC NULLS LAST) AS dense_rank
FROM tasks
ORDER BY estimate_minutes DESC NULLS LAST, id;

-- 每个用户最新的一个任务:三种写法
-- 写法 ①:row_number() = 1(标准 SQL,哪个数据库都能用;要 Top-N 就改成 <= N)
SELECT owner_id, title, created_at FROM (
  SELECT t.*, row_number() OVER (PARTITION BY owner_id ORDER BY created_at DESC, id DESC) AS rn
  FROM tasks t
) x
WHERE rn = 1
ORDER BY owner_id;
-- 写法 ②:DISTINCT ON(PostgreSQL 特有):每个 owner_id 只留排序后的第一行
SELECT DISTINCT ON (owner_id) owner_id, title, created_at
FROM tasks
ORDER BY owner_id, created_at DESC, id DESC;
-- 写法 ③:LATERAL 子查询:对每个用户「去取他最新的一个」(没有任务的 Carol 也能留下来)
SELECT u.id AS owner_id, latest.title, latest.created_at
FROM users u
LEFT JOIN LATERAL (
  SELECT title, created_at FROM tasks t
  WHERE t.owner_id = u.id
  ORDER BY created_at DESC, id DESC
  LIMIT 1
) latest ON true
ORDER BY u.id;

-- lag / lead:和同一组里的上一行 / 下一行比。「Alice 每个任务比上一个晚了多久」
SELECT title, created_at,
       lag(created_at) OVER w                 AS 上一个的时间,
       created_at - lag(created_at) OVER w    AS 间隔,
       lead(title) OVER w                     AS 下一个任务
FROM tasks
WHERE owner_id = 1
WINDOW w AS (ORDER BY created_at)
ORDER BY created_at;

-- 累计和 / 移动平均:按时间累加 Alice 的预估时长;最近 2 个任务的平均
SELECT title, estimate_minutes,
       sum(estimate_minutes) OVER (ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS 累计,
       round(avg(estimate_minutes) OVER (ORDER BY created_at ROWS BETWEEN 1 PRECEDING AND CURRENT ROW), 1) AS 最近两个的平均
FROM tasks
WHERE owner_id = 1
ORDER BY created_at;

-- 窗口函数不能写在 WHERE 里(Day 25 的逻辑执行顺序:窗口函数在 SELECT 这一步才算)
SELECT title FROM tasks WHERE row_number() OVER (PARTITION BY owner_id ORDER BY created_at DESC) = 1;
