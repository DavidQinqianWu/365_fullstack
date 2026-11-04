-- Day 23 · 06:拆开之后,用 JOIN 把原来那张宽表「拼回来」
-- 只用最基本的 INNER JOIN(写成 JOIN);各种 JOIN、GROUP BY 的细节 Day 25 讲
SET search_path = day23;

-- 任务 + 负责人:每个任务一行
SELECT t.id, t.title, t.done, u.email AS owner_email, u.name AS owner_name
FROM tasks t
JOIN users u ON u.id = t.owner_id
ORDER BY t.id;

-- 任务 + 标签:多对多要经过中间表,一个「任务-标签」组合一行
SELECT t.id, t.title, g.name AS tag
FROM tasks t
JOIN task_tags tt ON tt.task_id = t.id
JOIN tags g ON g.id = tt.tag_id
ORDER BY t.id, g.name;

-- 反过来问:带 urgent 标签的任务(同一张中间表,从另一头进)
SELECT g.name AS tag, t.id, t.title
FROM tags g
JOIN task_tags tt ON tt.tag_id = g.id
JOIN tasks t ON t.id = tt.task_id
WHERE g.name = 'urgent'
ORDER BY t.id;

-- 把标签和清单再「折叠」回一行一个任务(string_agg + GROUP BY,Day 25 细讲)
SELECT t.id, t.title, u.name AS owner,
       (SELECT string_agg(g.name, ',' ORDER BY g.name)
          FROM task_tags tt JOIN tags g ON g.id = tt.tag_id
         WHERE tt.task_id = t.id) AS tags,
       (SELECT count(*) FROM checklist_items c WHERE c.task_id = t.id) AS 清单项数
FROM tasks t
JOIN users u ON u.id = t.owner_id
ORDER BY t.id;
