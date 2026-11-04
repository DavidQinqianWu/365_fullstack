-- Day 25 · 02:JOIN 全家 —— 按条件把两张表的行「配对」
SET search_path = day25;

-- ① INNER JOIN:只要两边都配得上的。Carol 没有任务,不出现
SELECT u.display_name, t.title
FROM users u
JOIN tasks t ON t.owner_id = u.id        -- JOIN 就是 INNER JOIN 的简写
ORDER BY u.id, t.id;

-- ② LEFT JOIN:左边(users)每一行都要;配不上的,右边的列补 NULL
SELECT u.display_name, t.title
FROM users u
LEFT JOIN tasks t ON t.owner_id = u.id
ORDER BY u.id, t.id;

-- 每个用户有几个任务(包括 0 个的)。注意数的是 t.id,不是 *(为什么?见 05-aggregate.sql)
SELECT u.display_name, count(t.id) AS 任务数
FROM users u
LEFT JOIN tasks t ON t.owner_id = u.id
GROUP BY u.id
ORDER BY u.id;

-- ③ LEFT JOIN 的附加条件,放在 ON 里还是 WHERE 里?「每个用户的未完成任务」
-- 放在 ON 里:先按条件配对,配不上的照样保留左边那一行
SELECT u.display_name, t.title AS 未完成任务
FROM users u
LEFT JOIN tasks t ON t.owner_id = u.id AND t.done = false
ORDER BY u.id, t.id;
-- 放在 WHERE 里:配对完了再过滤,补出来的 NULL 行(t.done 是 NULL)被一起筛掉 —— 等于变回了 INNER JOIN
SELECT u.display_name, t.title AS 未完成任务
FROM users u
LEFT JOIN tasks t ON t.owner_id = u.id
WHERE t.done = false
ORDER BY u.id, t.id;

-- ④ RIGHT JOIN = 把 LEFT JOIN 两边换个位置(下面这条和 ② 的结果一样);
--    FULL OUTER JOIN = 两边都全要,配不上的各补 NULL(今天的数据里每个任务都有负责人,不单独演示)
SELECT u.display_name, t.title
FROM tasks t
RIGHT JOIN users u ON t.owner_id = u.id
ORDER BY u.id, t.id;

-- ⑤ CROSS JOIN:不要条件,左边每一行配右边每一行(笛卡尔积)
SELECT u.display_name, g.name AS tag
FROM users u
CROSS JOIN tags g
ORDER BY u.id, g.id;
-- 旧式写法 FROM a, b 却忘了写连接条件 —— 也是笛卡尔积
SELECT count(*) AS 忘了写条件时的行数 FROM users, tasks;
SELECT (SELECT count(*) FROM users) AS 用户数, (SELECT count(*) FROM tasks) AS 任务数;

-- ⑥ 自连接:同一张表用两个别名,当成两张表来配对
SELECT e.name AS 员工, m.name AS 经理
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id     -- 用 LEFT:老板没有经理,也要列出来
ORDER BY e.id;
