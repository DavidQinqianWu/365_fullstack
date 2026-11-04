-- Day 39 · 05:死锁 —— 两个窗口的手动步骤(观察脚本自动做了一遍)
-- 两个窗口都先:SET search_path = day39;
--   A: BEGIN;  UPDATE accounts SET balance = balance - 10 WHERE id = 1;    -- A 锁住 1 号
--   B: BEGIN;  UPDATE accounts SET balance = balance - 10 WHERE id = 2;    -- B 锁住 2 号
--   A: UPDATE accounts SET balance = balance + 10 WHERE id = 2;            -- A 等 B
--   B: UPDATE accounts SET balance = balance + 10 WHERE id = 1;            -- B 等 A → 1 秒后(deadlock_timeout)其中一个报:
--      ERROR 40P01 deadlock detected
--      DETAIL: Process … waits for ShareLock on transaction …; blocked by process ….
--   另一个照常继续;两个都 COMMIT / ROLLBACK 结束。
--
-- 修法:所有人都按同一个顺序加锁(比如按 id 从小到大),一次锁住要改的所有行
--   A: BEGIN;  SELECT id FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
--   B: BEGIN;  SELECT id FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;   -- 等 A,而不是互相等
--   A: …改两行…  COMMIT;     B: 拿到锁,…改两行…  COMMIT;
SET search_path = day39;
SHOW deadlock_timeout;
