-- Day 23 · 02:宽表的三类异常 + 一个「不是原子值」的问题
-- 每个实验都包在 BEGIN … ROLLBACK 里,做完就撤销,后面的脚本拿到的还是原始数据。
SET search_path = day23;

-- ① 更新异常:Alice 换了邮箱。她的邮箱存了 3 份,只改了其中一行……
BEGIN;
UPDATE tasks_wide SET owner_email = 'alice@new.example' WHERE task_id = 1;
SELECT DISTINCT owner_name, owner_email FROM tasks_wide WHERE owner_name = 'Alice';
ROLLBACK;

-- ② 插入异常:新用户 Carol 注册了,但还没有任务。怎么把她记下来?
--    task_id 是主键,不能为空;只能编一个「假任务」……
BEGIN;
INSERT INTO tasks_wide (task_id, owner_email, owner_name) VALUES (NULL, 'carol@example.com', 'Carol');
ROLLBACK;
BEGIN;
INSERT INTO tasks_wide (task_id, title, owner_email, owner_name) VALUES (99, '(占位,不是真任务)', 'carol@example.com', 'Carol');
SELECT count(*) AS 任务总数 FROM tasks_wide;     -- 统计任务数时,这条假任务也会被算进去
ROLLBACK;

-- ③ 删除异常:Bob 修好了自行车,删掉他唯一的任务 —— Bob 这个人也一起没了
BEGIN;
DELETE FROM tasks_wide WHERE task_id = 4;
SELECT DISTINCT owner_name, owner_email FROM tasks_wide ORDER BY owner_name;
ROLLBACK;

-- ④ 不是原子值:想查「带 urgent 标签的任务」,得把三列都问一遍;
--    想查「清单里有『牛奶』的任务」,只能在字符串里模糊匹配
SELECT task_id, title FROM tasks_wide
WHERE tag1 = 'urgent' OR tag2 = 'urgent' OR tag3 = 'urgent'
ORDER BY task_id;
SELECT task_id, title, checklist FROM tasks_wide WHERE checklist LIKE '%牛奶%';
-- 「牛奶这一项完成了没有」?在 '鸡蛋:f,牛奶:f,面包:t' 里自己切字符串去吧
