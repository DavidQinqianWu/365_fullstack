-- Day 40 · 01:用纯 SQL 看「丢失更新」和「带版本号的写」(独立的 schema day40;重跑会整个删掉重建)
--
-- 这个文件可以一口气跑完(npm run day40 的第 1 幕就是这么跑的):
-- 两个「客户端」A、B 的读,用 psql 的 \gset 存进变量 —— 相当于前端把 GET 到的任务放在页面状态里,
-- 过一会儿再拿着它去 PUT。两个客户端都在用同一个连接也没关系:丢失更新根本不需要两个事务同时开着,
-- 它发生在「读」和「写」是两次独立的操作、中间隔着别人的写。
--
-- 想用两个窗口亲手做一遍(效果一样):
--   窗口 A:SELECT title, done, version FROM day40.tasks WHERE id = 1;            -- 记下 version = 1
--   窗口 B:SELECT title, done, version FROM day40.tasks WHERE id = 1;            -- 也是 version = 1
--   窗口 B:UPDATE day40.tasks SET done = true, version = version + 1 WHERE id = 1 AND version = 1;  -- UPDATE 1
--   窗口 A:UPDATE day40.tasks SET title = 'A 改的标题', done = false, version = version + 1 WHERE id = 1 AND version = 1;
--           -- UPDATE 0:A 基于的第 1 版已经不存在了。去掉 AND version = 1 再执行一次,就是 Day 39 以前 nest-lab 的写法:
--           -- UPDATE 1,B 的 done = true 被 A 手里那份旧的 done = false 悄悄盖掉
\set ON_ERROR_STOP on
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS day40 CASCADE;
CREATE SCHEMA day40;
SET search_path = day40;

CREATE TABLE tasks (
  id      int PRIMARY KEY,
  title   text NOT NULL,
  done    boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1)
);
INSERT INTO tasks (id, title) VALUES (1, '写周报'), (2, '写周报');

\echo '---- 不带版本号(id = 1):A、B 都先读,B 先写,A 后写 ----'
SELECT title AS a_title, done AS a_done FROM tasks WHERE id = 1 \gset
\echo 'A 读到:' :a_title ', done =' :a_done
SELECT title AS b_title, done AS b_done FROM tasks WHERE id = 1 \gset
\echo 'B 读到:' :b_title ', done =' :b_done
\echo 'B:把任务标成已完成(整份写回:标题照旧,done = true)'
UPDATE tasks SET title = :'b_title', done = true WHERE id = 1;
\echo 'A:改了标题,把手里那份(done 还是 false)整份写回'
UPDATE tasks SET title = 'A 改的标题', done = :'a_done' WHERE id = 1;
SELECT id, title, done FROM tasks WHERE id = 1;
\echo '↑ B 的「已完成」没了,没有任何报错 —— 这就是丢失更新(lost update)'

\echo ''
\echo '---- 带版本号(id = 2):同样的顺序,写的时候加 AND version = 读到的版本 ----'
SELECT title AS a_title, done AS a_done, version AS a_version FROM tasks WHERE id = 2 \gset
\echo 'A 读到:version =' :a_version
SELECT title AS b_title, done AS b_done, version AS b_version FROM tasks WHERE id = 2 \gset
\echo 'B 读到:version =' :b_version
UPDATE tasks SET title = :'b_title', done = true, version = version + 1 WHERE id = 2 AND version = :b_version;
\echo '↑ B:UPDATE 1(version 1 → 2)'
UPDATE tasks SET title = 'A 改的标题', done = :'a_done', version = version + 1 WHERE id = 2 AND version = :a_version;
\echo '↑ A:UPDATE 0 —— 它基于的第 1 版已经不在了,什么都没写。应用看到 0 行,就知道「被人抢先了」'
SELECT id, title, done, version FROM tasks WHERE id = 2;
\echo '0 行也可能是「这一行被删了」:再查一次 id 在不在,区分 404 和 409(nest-lab 的 PgTasksRepository.update 就是这么做的)'
SELECT EXISTS (SELECT 1 FROM tasks WHERE id = 2) AS 行还在;
