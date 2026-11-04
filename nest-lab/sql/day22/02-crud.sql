-- Day 22 · 02:CRUD,和 Day 15 的 HTTP 方法一一对应
-- 每条语句执行完,psql 会打印一个「命令标签」:INSERT 0 1 / UPDATE 1 / DELETE 0 …
-- 后面那个数字就是「影响了几行」—— Day 27 接回 nest-lab 时,UPDATE 0 / DELETE 0 就要翻译成 404。

-- POST /tasks  →  INSERT
INSERT INTO tasks (title) VALUES ('学 psql');
INSERT INTO tasks (title, done) VALUES ('建第一张表', true);
INSERT INTO tasks (title) VALUES ('写 CRUD'), ('故意忘写 WHERE'), ('复盘 Week 3');

-- GET /tasks  →  SELECT(集合)
SELECT id, title, done FROM tasks ORDER BY id;

-- GET /tasks/2  →  SELECT ... WHERE(单个)
SELECT id, title, done FROM tasks WHERE id = 2;

-- GET /tasks/999  →  0 行(nest-lab 里应该回 404)
SELECT id, title, done FROM tasks WHERE id = 999;

-- PUT /tasks/3  →  UPDATE,把客户端能写的列全部给出(整体替换)
UPDATE tasks SET title = '写 CRUD(整体替换)', done = false WHERE id = 3;

-- PATCH /tasks/3  →  UPDATE,只改给了的列(部分更新)
UPDATE tasks SET done = true WHERE id = 3;

-- PATCH /tasks/999  →  UPDATE 0:一行都没改到
UPDATE tasks SET done = true WHERE id = 999;

-- DELETE /tasks/5  →  DELETE
DELETE FROM tasks WHERE id = 5;

-- 再 DELETE 一次:DELETE 0(幂等:结果一样,只是这次没删到东西)
DELETE FROM tasks WHERE id = 5;

-- 最后看一眼
SELECT id, title, done FROM tasks ORDER BY id;
