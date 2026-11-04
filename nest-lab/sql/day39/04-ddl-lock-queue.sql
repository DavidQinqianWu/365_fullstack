-- Day 39 · 04:DDL 锁队列 —— 一个 ALTER TABLE 在门口排队,后面所有的普通 SELECT 都被它挡住
-- 三个 psql 窗口的手动步骤(观察脚本自动做了一遍):都先 SET search_path = day39;
--   A(一个还没结束的读事务):BEGIN;  SELECT count(*) FROM big;          -- 拿着 ACCESS SHARE,不提交
--   B(迁移):ALTER TABLE big ADD COLUMN note text;                        -- 要 ACCESS EXCLUSIVE,和 A 冲突 → 排队
--   C(一个普通请求):SELECT count(*) FROM big;                           -- ACCESS SHARE 本来和 A 不冲突,可它排在 B 后面 → 也卡住
--   第四个窗口:\i sql/day39/06-who-blocks.sql                             -- 看谁在等谁
--   A:COMMIT;     → B 拿到锁、做完;C 接着返回
--   最后:ALTER TABLE big DROP COLUMN IF EXISTS note;
--
-- 线上的做法:迁移拿不到锁就放弃、过一会儿重试,别让整张表跟着排队
--   B:SET lock_timeout = '200ms';  ALTER TABLE big ADD COLUMN note text;
--     → ERROR 55P03 canceling statement due to lock timeout(C 只被挡了 200 毫秒)
SET search_path = day39;
\echo '=== 常见语句拿的表锁(在一个事务里执行,然后看 pg_locks)'
BEGIN;
SELECT count(*) FROM big;                                   -- ACCESS SHARE
UPDATE accounts SET balance = balance WHERE id = 1;         -- ROW EXCLUSIVE
CREATE INDEX big_v_idx ON big (v);                          -- SHARE(挡写,不挡读)
SELECT relation::regclass AS 表, mode AS 锁模式, granted AS 拿到了
FROM pg_locks WHERE pid = pg_backend_pid() AND locktype = 'relation' AND relation::regclass::text IN ('big', 'accounts', 'day39.big', 'day39.accounts')
ORDER BY 1, 2;
ROLLBACK;
BEGIN;
ALTER TABLE big ADD COLUMN note text;                       -- ACCESS EXCLUSIVE
SELECT relation::regclass AS 表, mode AS 锁模式 FROM pg_locks
WHERE pid = pg_backend_pid() AND locktype = 'relation' AND relation = 'day39.big'::regclass;
ROLLBACK;
