-- Day 25 · 06:子查询与 CTE(WITH)
SET search_path = day25;

-- 标量子查询:返回「一个值」,可以放在 SELECT 里(每一行算一次)
SELECT t.title,
       (SELECT count(*) FROM checklist_items c WHERE c.task_id = t.id) AS 清单项数
FROM tasks t
ORDER BY t.id;

-- 派生表:FROM 里放一个子查询,当成一张临时的表
SELECT x.display_name, x.任务数
FROM (SELECT u.display_name, count(t.id) AS 任务数
        FROM users u LEFT JOIN tasks t ON t.owner_id = u.id
       GROUP BY u.id) AS x
WHERE x.任务数 = 0;

-- 同样的事,用 CTE 分步写:先算「每个用户的统计」,再在上面提问。每一步有名字,读起来像几行代码
WITH per_user AS (
  SELECT u.id, u.display_name,
         count(t.id)                       AS 任务数,
         count(t.id) FILTER (WHERE t.done) AS 已完成
  FROM users u LEFT JOIN tasks t ON t.owner_id = u.id
  GROUP BY u.id
),
with_rate AS (
  SELECT *, CASE WHEN 任务数 = 0 THEN NULL ELSE round(100.0 * 已完成 / 任务数) END AS 完成率
  FROM per_user
)
SELECT display_name, 任务数, 已完成, 完成率 FROM with_rate ORDER BY id;

-- 递归 CTE:从老板开始,一层一层往下找出整个组织
WITH RECURSIVE org AS (
  -- 起点:没有经理的人
  SELECT id, name, manager_id, 1 AS 层级, name::text AS 汇报路径
  FROM employees
  WHERE manager_id IS NULL
  UNION ALL
  -- 递推:找出「经理在上一轮结果里」的人
  SELECT e.id, e.name, e.manager_id, o.层级 + 1, o.汇报路径 || ' → ' || e.name
  FROM employees e
  JOIN org o ON e.manager_id = o.id
)
SELECT 层级, repeat('    ', 层级 - 1) || name AS 组织架构, 汇报路径
FROM org
ORDER BY 汇报路径;

-- 反过来:小王的上级链(从下往上找)
WITH RECURSIVE chain AS (
  SELECT id, name, manager_id FROM employees WHERE name = '后端工程师小王'
  UNION ALL
  SELECT m.id, m.name, m.manager_id FROM employees m JOIN chain c ON m.id = c.manager_id
)
SELECT string_agg(name, ' → ') AS 小王的汇报链 FROM chain;
