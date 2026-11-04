-- Day 36 · 03:一致性(Consistency)—— 事务结束时,所有约束都要成立;但「所有规则」大部分是应用的责任
SET search_path = day36;
SET client_min_messages = warning;
DELETE FROM items_now; DELETE FROM items_later; DELETE FROM boxes;

\echo '=== ① 普通外键:每条语句执行完就检查。先放物品、后建箱子 → 第一条就失败'
BEGIN;
INSERT INTO items_now VALUES (1, 10);
INSERT INTO boxes VALUES (10);
COMMIT;

\echo '=== ② 可延迟的外键(DEFERRABLE INITIALLY DEFERRED):事务中间可以暂时不满足,COMMIT 时才检查'
BEGIN;
INSERT INTO items_later VALUES (1, 10);   -- 箱子 10 还不存在,但不报错
SELECT count(*) AS "此刻 items_later 里指向不存在箱子的行" FROM items_later i WHERE NOT EXISTS (SELECT 1 FROM boxes b WHERE b.id = i.box_id);
INSERT INTO boxes VALUES (10);
COMMIT;                                   -- 提交时检查:箱子已经有了 → 成功
SELECT * FROM items_later;

\echo '--- 提交时还不满足:COMMIT 这一刻才报错,整个事务回滚'
BEGIN;
INSERT INTO items_later VALUES (2, 99);   -- 箱子 99 永远不会建
INSERT INTO notes VALUES (100, '和它同一个事务的另一行');
COMMIT;
SELECT count(*) AS "notes 里 id=100 的行(应为 0)" FROM notes WHERE id = 100;

\echo '--- 也可以在事务里临时改成立即检查:SET CONSTRAINTS … IMMEDIATE'
BEGIN;
SET CONSTRAINTS ALL IMMEDIATE;
INSERT INTO items_later VALUES (3, 98);   -- 这次在这一条就报错
ROLLBACK;

\echo '=== ③ 数据库只检查你告诉它的规则:「两人合计不变」它不知道'
UPDATE accounts SET balance = CASE id WHEN 1 THEN 100 ELSE 50 END;
BEGIN;
UPDATE accounts SET balance = balance - 30 WHERE id = 1;   -- 有 bug 的转账:只扣款,忘了加款
COMMIT;                                                    -- 所有约束都成立,提交成功
SELECT owner, balance FROM accounts ORDER BY id;
SELECT sum(balance) AS "两人合计(本来是 150)" FROM accounts;
UPDATE accounts SET balance = CASE id WHEN 1 THEN 100 ELSE 50 END;
