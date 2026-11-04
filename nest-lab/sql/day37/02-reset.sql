-- Day 37 · 02:把四张表复原成初始状态(每个场景开始前执行一次)
SET search_path = day37;
TRUNCATE accounts, tasks, counters, doctors RESTART IDENTITY;
INSERT INTO accounts VALUES (1, 100);
INSERT INTO tasks (owner_id, title, done) VALUES (1, '写周报', false), (1, '修 bug', false), (1, '已完成的', true), (2, '别人的', false);
INSERT INTO counters VALUES (1, 0);
INSERT INTO doctors VALUES ('Alice', true), ('Bob', true);
