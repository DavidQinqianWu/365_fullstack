-- Day 36 · 02:原子性(Atomicity)—— 一张整单作业单,要么全部办完盖章,要么整张作废
-- 场景:Alice 给 Bob 转 130 元。先给 Bob 加钱,再从 Alice 扣钱;但 Alice 只有 100,扣款会违反 CHECK (balance >= 0)。
SET search_path = day36;
UPDATE accounts SET balance = CASE id WHEN 1 THEN 100 ELSE 50 END;   -- 重跑时先复原

\echo '=== ① 不用事务(psql 默认 autocommit:每条语句自己就是一个事务)'
UPDATE accounts SET balance = balance + 130 WHERE id = 2;   -- Bob 加款:成功,并且立刻提交了
UPDATE accounts SET balance = balance - 130 WHERE id = 1;   -- Alice 扣款:失败
SELECT owner, balance FROM accounts ORDER BY id;
SELECT sum(balance) AS "两人合计(本来是 150)" FROM accounts;

UPDATE accounts SET balance = CASE id WHEN 1 THEN 100 ELSE 50 END;
\echo '=== ② 用事务:两步放在同一个 BEGIN … 里'
BEGIN;
UPDATE accounts SET balance = balance + 130 WHERE id = 2;
UPDATE accounts SET balance = balance - 130 WHERE id = 1;   -- 失败
\echo '--- 出错之后,这个事务里再执行任何语句(哪怕是 SELECT 1)都会被拒绝:'
SELECT 1;
\echo '--- 这时 COMMIT 也提交不了:psql 会显示 ROLLBACK'
COMMIT;
SELECT owner, balance FROM accounts ORDER BY id;
SELECT sum(balance) AS "两人合计" FROM accounts;

\echo '=== ③ 保存点(SAVEPOINT):撤回到作业单上的某个签字处,而不是整张作废'
DELETE FROM notes;
BEGIN;
INSERT INTO notes VALUES (1, '第一条');
SAVEPOINT before_second;
INSERT INTO notes VALUES (1, '主键重复,会失败');
ROLLBACK TO SAVEPOINT before_second;     -- 只撤回保存点之后的部分,事务恢复正常
INSERT INTO notes VALUES (2, '第二条');
COMMIT;
SELECT * FROM notes ORDER BY id;

\echo '=== ④ 自增序列不回滚:事务回滚了,用掉的号也不还'
CREATE TEMP TABLE seq_demo (id int GENERATED ALWAYS AS IDENTITY, v text);
INSERT INTO seq_demo (v) VALUES ('a');
BEGIN;
INSERT INTO seq_demo (v) VALUES ('b');
ROLLBACK;
INSERT INTO seq_demo (v) VALUES ('c');
SELECT * FROM seq_demo;
