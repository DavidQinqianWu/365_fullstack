-- Day 25 · 04:扇出(fan-out)—— JOIN 之后行数变多,再求和就算重了
SET search_path = day25;

-- 想要:每个用户的任务预估总时长,以及他用过几个标签
-- 先看 Alice 自己算的账:30 + 20 + 40 = 90 分钟
SELECT owner_id, sum(estimate_minutes) AS 正确的总时长 FROM tasks GROUP BY owner_id ORDER BY owner_id;

-- 一条 SQL 同时 JOIN 任务和标签,再 SUM(用 LEFT JOIN:没有任务的 Carol、没有标签的「写周报」也都留着)
SELECT u.display_name,
       sum(t.estimate_minutes) AS 总时长,
       count(tt.tag_id)        AS 标签数
FROM users u
LEFT JOIN tasks t      ON t.owner_id = u.id
LEFT JOIN task_tags tt ON tt.task_id = t.id
GROUP BY u.id
ORDER BY u.id;

-- 为什么?把 JOIN 之后、聚合之前的中间结果摊开看:有 2 个标签的任务被复制成了 2 行
SELECT u.display_name, t.title, t.estimate_minutes, tt.tag_id
FROM users u
LEFT JOIN tasks t      ON t.owner_id = u.id
LEFT JOIN task_tags tt ON tt.task_id = t.id
WHERE u.display_name = 'Alice'
ORDER BY t.id, tt.tag_id;

-- 修法 1:先各自聚合,再 JOIN(每个子结果都是「一个用户一行」,JOIN 时不会再扇出)
SELECT u.display_name,
       coalesce(ts.总时长, 0)  AS 总时长,
       coalesce(tg.标签数, 0)  AS 标签数
FROM users u
LEFT JOIN (SELECT owner_id, sum(estimate_minutes) AS 总时长 FROM tasks GROUP BY owner_id) ts
       ON ts.owner_id = u.id
LEFT JOIN (SELECT t.owner_id, count(DISTINCT tt.tag_id) AS 标签数
             FROM tasks t JOIN task_tags tt ON tt.task_id = t.id
            GROUP BY t.owner_id) tg
       ON tg.owner_id = u.id
ORDER BY u.id;

-- 修法 2:只需要「数个数」时,COUNT(DISTINCT …) 能去掉重复(但 SUM(DISTINCT …) 不行:两个任务时长恰好相同就会被当成一个)
SELECT u.display_name, count(DISTINCT t.id) AS 任务数, count(DISTINCT tt.tag_id) AS 标签种类
FROM users u
LEFT JOIN tasks t      ON t.owner_id = u.id
LEFT JOIN task_tags tt ON tt.task_id = t.id
GROUP BY u.id
ORDER BY u.id;
