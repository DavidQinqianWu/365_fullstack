-- Day 25 · 03:半连接 / 反连接 —— 只问「有没有」,不要对面的行
SET search_path = day25;

-- 半连接 EXISTS:有 urgent 标签的任务(每个任务最多出现一次)
SELECT t.id, t.title
FROM tasks t
WHERE EXISTS (
  SELECT 1 FROM task_tags tt JOIN tags g ON g.id = tt.tag_id
  WHERE tt.task_id = t.id AND g.name = 'urgent'
)
ORDER BY t.id;

-- 同一个问题用 IN 写
SELECT id, title FROM tasks
WHERE id IN (SELECT tt.task_id FROM task_tags tt JOIN tags g ON g.id = tt.tag_id WHERE g.name = 'urgent')
ORDER BY id;

-- 反连接 NOT EXISTS:一个任务都没有的用户
SELECT u.display_name
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.owner_id = u.id);

-- 反连接 NOT EXISTS:没有任何标签的任务
SELECT t.id, t.title
FROM tasks t
WHERE NOT EXISTS (SELECT 1 FROM task_tags tt WHERE tt.task_id = t.id);

-- NOT IN 的坑:「不是任何人经理的员工」(也就是基层员工)
-- 子查询里的 manager_id 有一个 NULL(老板没有经理)……
SELECT manager_id FROM employees ORDER BY manager_id NULLS FIRST;
SELECT name AS "用 NOT IN 查到的" FROM employees
WHERE id NOT IN (SELECT manager_id FROM employees);
-- 同一个问题用 NOT EXISTS
SELECT e.name AS "用 NOT EXISTS 查到的" FROM employees e
WHERE NOT EXISTS (SELECT 1 FROM employees x WHERE x.manager_id = e.id)
ORDER BY e.id;
-- 为什么?x NOT IN (a, b, NULL) 等于 x <> a AND x <> b AND x <> NULL,而 x <> NULL 永远是「不知道」
SELECT 6 NOT IN (2, 4, NULL) AS "6 NOT IN (2, 4, NULL)", (6 NOT IN (2, 4, NULL)) IS NULL AS "结果是不是 NULL";
