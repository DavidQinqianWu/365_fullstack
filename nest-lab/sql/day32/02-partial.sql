-- Day 32 · 02:部分索引(partial index)—— 只给「还没完成」的任务建卡片
-- 场景:「所有未完成任务里最新的 20 个」。未完成只占 10%,已完成的 90% 永远不会被这个查询问到。
SET search_path = day32;
SET max_parallel_workers_per_gather = 0;   -- 只为了计划好读
SET client_min_messages = warning;
DROP INDEX IF EXISTS tasks_done_created_idx, tasks_open_created_idx;

-- ① 两种建法的大小
CREATE INDEX tasks_done_created_idx ON tasks (done, created_at);                -- 完整索引:100 万个条目
CREATE INDEX tasks_open_created_idx ON tasks (created_at) WHERE done = false;   -- 部分索引:只收未完成的
SELECT indexrelid::regclass AS 索引, pg_size_pretty(pg_relation_size(indexrelid)) AS 大小,
       pg_get_expr(indpred, indrelid) AS "只收哪些行(WHERE)"
FROM pg_index WHERE indrelid = 'tasks'::regclass AND indexrelid::regclass::text LIKE 'tasks_%created_idx' ORDER BY 1;
-- 下面只留部分索引,看哪些写法能用上它
DROP INDEX tasks_done_created_idx;

\echo '=== ② WHERE done = false(和索引的条件一字不差)'
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) SELECT id, title, created_at FROM tasks WHERE done = false ORDER BY created_at DESC LIMIT 20;
\echo '=== ③ WHERE NOT done(意思相同、写法不同)'
EXPLAIN (COSTS OFF) SELECT id, title, created_at FROM tasks WHERE NOT done ORDER BY created_at DESC LIMIT 20;
\echo '=== ④ WHERE done IS NOT TRUE(列是 NOT NULL,意思其实也一样)'
EXPLAIN (COSTS OFF) SELECT id, title, created_at FROM tasks WHERE done IS NOT TRUE ORDER BY created_at DESC LIMIT 20;
\echo '=== ⑤ WHERE done = true(要的是索引没收的那 90%)'
EXPLAIN (COSTS OFF) SELECT id, title, created_at FROM tasks WHERE done = true ORDER BY created_at DESC LIMIT 20;

\echo '=== ⑥ 参数化:done = $1。PREPARE 一次,EXECUTE 多次'
PREPARE open_latest(boolean) AS
  SELECT id, title, created_at FROM tasks WHERE done = $1 ORDER BY created_at DESC LIMIT 20;
-- 默认 plan_cache_mode = auto:前 5 次用「代入实际值」的定制计划(custom plan),之后比较通用计划(generic plan)划不划算
SHOW plan_cache_mode;
EXPLAIN (COSTS OFF) EXECUTE open_latest(false);
EXECUTE open_latest(false) \g /dev/null
EXECUTE open_latest(false) \g /dev/null
EXECUTE open_latest(false) \g /dev/null
EXECUTE open_latest(false) \g /dev/null
EXECUTE open_latest(false) \g /dev/null
EXECUTE open_latest(false) \g /dev/null
EXPLAIN (COSTS OFF) EXECUTE open_latest(false);
SELECT name, generic_plans AS 用通用计划的次数, custom_plans AS 用定制计划的次数 FROM pg_prepared_statements;
\echo '--- 强制用通用计划(不看 $1 的值做计划)'
SET plan_cache_mode = force_generic_plan;
EXPLAIN (COSTS OFF) EXECUTE open_latest(false);
RESET plan_cache_mode;
\echo '--- PostgreSQL 16 起可以直接看一条带 $1 的 SQL 的通用计划'
EXPLAIN (GENERIC_PLAN, COSTS OFF) SELECT id, title, created_at FROM tasks WHERE done = $1 ORDER BY created_at DESC LIMIT 20;
DEALLOCATE open_latest;

\echo '=== ⑦ 部分唯一索引:每个会员只能有一个「正在计时」的任务'
DROP TABLE IF EXISTS timers;
CREATE TABLE timers (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES users (id),
  task_id    bigint NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  stopped_at timestamptz            -- NULL = 还在计时
);
CREATE UNIQUE INDEX timers_one_running_per_user ON timers (user_id) WHERE stopped_at IS NULL;
INSERT INTO timers (user_id, task_id) VALUES (1, 101);                     -- 开始计时
INSERT INTO timers (user_id, task_id) VALUES (1, 102);                     -- 又开一个:应该被拒绝
UPDATE timers SET stopped_at = now() WHERE user_id = 1 AND stopped_at IS NULL;   -- 停掉
INSERT INTO timers (user_id, task_id) VALUES (1, 102);                     -- 现在可以了
INSERT INTO timers (user_id, task_id) VALUES (2, 201);                     -- 别的会员不受影响
SELECT user_id, task_id, stopped_at IS NULL AS 正在计时 FROM timers ORDER BY id;

\echo '=== ⑧ 部分唯一 + 表达式:软删除后,同一个邮箱(不分大小写)可以重新注册'
DROP TABLE IF EXISTS accounts;
CREATE TABLE accounts (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      text NOT NULL,
  deleted_at timestamptz            -- 软删除:不真删,只标记
);
CREATE UNIQUE INDEX accounts_email_active_key ON accounts (lower(email)) WHERE deleted_at IS NULL;
INSERT INTO accounts (email) VALUES ('Alice@Example.com');
INSERT INTO accounts (email) VALUES ('alice@example.com');               -- 还没删:应该被拒绝
UPDATE accounts SET deleted_at = now() WHERE lower(email) = 'alice@example.com';
INSERT INTO accounts (email) VALUES ('alice@example.com');               -- 软删除之后:可以重新注册
-- ON CONFLICT 要写出同样的表达式和 WHERE,数据库才找得到这个唯一索引
INSERT INTO accounts (email) VALUES ('ALICE@example.com')
  ON CONFLICT (lower(email)) WHERE deleted_at IS NULL DO NOTHING;
SELECT id, email, deleted_at IS NOT NULL AS 已软删除 FROM accounts ORDER BY id;

DROP TABLE timers, accounts;
DROP INDEX tasks_open_created_idx;
