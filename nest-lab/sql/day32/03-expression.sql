-- Day 32 · 03:表达式索引(expression index)—— 卡片上写的是「邮箱的小写」,问的时候也要问小写
-- 回扣 Day 24:users 的邮箱唯一性用的就是 lower(email) 上的唯一索引。
SET search_path = day32;
SET max_parallel_workers_per_gather = 0;
SET client_min_messages = warning;
DROP INDEX IF EXISTS users_email_lower_key, tasks_created_utc_date_idx, tasks_created_day_utc_idx;

CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
ANALYZE users;   -- 表达式索引建好后 ANALYZE 一次:数据库会顺便收集「lower(email) 这个表达式」的统计信息

\echo '=== ① WHERE lower(email) = …(和索引的表达式一字不差)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, email FROM users WHERE lower(email) = 'user42@example.com';
\echo '=== ② WHERE email = …(原样比较:索引里存的是小写,对不上)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, email FROM users WHERE email = 'User42@Example.com';
\echo '=== ③ WHERE email ILIKE …(意思也是「不分大小写」,但不是同一个表达式)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, email FROM users WHERE email ILIKE 'user42@example.com';

\echo '=== ④ 按「哪一天」建索引:created_at::date'
CREATE INDEX tasks_created_date_idx ON tasks ((created_at::date));
\echo '--- date_trunc 也一样'
CREATE INDEX tasks_created_day_idx ON tasks (date_trunc('day', created_at));
\echo '--- 为什么?同一个时刻,换个时区就是另一天(Day 26)'
SET timezone = 'UTC';
SELECT timestamptz '2025-06-01 20:00+00' AS 时刻, (timestamptz '2025-06-01 20:00+00')::date AS "UTC 下是哪天";
SET timezone = 'Asia/Shanghai';
SELECT timestamptz '2025-06-01 20:00+00' AS 时刻, (timestamptz '2025-06-01 20:00+00')::date AS "上海 下是哪天";
RESET timezone;
\echo '--- 函数的「易变性」:i = IMMUTABLE(同样输入永远同样输出),s = STABLE(一条语句内不变,但受时区等设置影响)'
SELECT p.oid::regprocedure AS 函数, p.provolatile AS 易变性
FROM pg_proc p
WHERE p.oid IN ('date(timestamp with time zone)'::regprocedure,           -- created_at::date 背后就是它
                'date_trunc(text, timestamp with time zone)'::regprocedure,
                'date_trunc(text, timestamp with time zone, text)'::regprocedure,
                'timezone(text, timestamp with time zone)'::regprocedure)
ORDER BY 1::text;

\echo '=== ⑤ 正确写法:把时区写死在表达式里'
CREATE INDEX tasks_created_utc_date_idx ON tasks (((created_at AT TIME ZONE 'UTC')::date));
CREATE INDEX tasks_created_day_utc_idx ON tasks (date_trunc('day', created_at, 'UTC'));
ANALYZE tasks;
\echo '--- 查询写同一个表达式:能用'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT count(*) FROM tasks WHERE (created_at AT TIME ZONE 'UTC')::date = '2025-06-01';
\echo '--- 查询写 created_at::date:不是同一个表达式,用不上'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT count(*) FROM tasks WHERE created_at::date = '2025-06-01';
DROP INDEX tasks_created_utc_date_idx, tasks_created_day_utc_idx;
\echo '=== ⑥ 很多时候根本不需要表达式索引:普通索引 + 范围条件(时区写在常量里)'
CREATE INDEX tasks_created_idx ON tasks (created_at);
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT count(*) FROM tasks
WHERE created_at >= timestamptz '2025-06-01 00:00+00' AND created_at < timestamptz '2025-06-02 00:00+00';
DROP INDEX tasks_created_idx;

DROP INDEX users_email_lower_key;
