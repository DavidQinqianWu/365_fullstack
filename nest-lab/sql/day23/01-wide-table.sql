-- Day 23 · 01:一本什么都记的大流水账(宽表)
-- 今天的所有表都放在独立的 schema day23 里,不碰 Day 22 的 public.tasks。
-- 重跑本文件会把 day23 整个删掉重建(⚠️ CASCADE 会连同里面所有表一起删)。

DROP SCHEMA IF EXISTS day23 CASCADE;
CREATE SCHEMA day23;
SET search_path = day23;     -- 之后不写 schema 名的表,都在 day23 里找 / 建

-- 一行 = 一个任务;负责人的信息、标签、清单全都塞在同一行里
CREATE TABLE tasks_wide (
  task_id     integer PRIMARY KEY,   -- 主键怎么选是 Day 24 的事,今天直接给编号
  title       text,
  done        boolean,
  owner_email text,
  owner_name  text,
  tag1        text,
  tag2        text,
  tag3        text,                  -- 想要第 4 个标签?只能改表结构
  checklist   text                   -- 「清单项:是否完成」用逗号拼起来
);

INSERT INTO tasks_wide VALUES
  (1, '学 psql',     false, 'alice@example.com', 'Alice', 'learning', 'urgent', NULL, '装 PG:t,连上 psql:t'),
  (2, '建第一张表',  true,  'alice@example.com', 'Alice', 'learning', NULL,     NULL, '写 CREATE TABLE:t'),
  (3, '买菜',        false, 'alice@example.com', 'Alice', 'home',     'urgent', NULL, '鸡蛋:f,牛奶:f,面包:t'),
  (4, '修自行车',    false, 'bob@example.com',   'Bob',   'home',     NULL,     NULL, NULL);

SELECT * FROM tasks_wide ORDER BY task_id;
