-- Day 36 · 05:持久性(Durability)—— 盖章之前,先在流水日记(WAL)上记一笔
-- COMMIT 返回之前,这次事务的 WAL 记录已经写到磁盘(fsync);之后哪怕断电,重启时照着 WAL 重放就能补回来。
-- 「真的崩溃一次」的实验要超级用户,见观察脚本的 --crash 模式和讲义。
SET search_path = day36;
SET client_min_messages = warning;

\echo '=== ① 相关设置(普通用户能看到)'
SELECT name, setting, unit FROM pg_settings
WHERE name IN ('fsync', 'synchronous_commit', 'wal_level', 'wal_writer_delay', 'full_page_writes', 'commit_delay')
ORDER BY name;

\echo '=== ② 一次 COMMIT 让 WAL 往前走了多少'
SELECT pg_current_wal_lsn() AS lsn0 \gset
INSERT INTO notes VALUES (500, '写 WAL 的例子') ON CONFLICT (id) DO NOTHING;
SELECT :'lsn0' AS 提交前, pg_current_wal_lsn() AS 提交后,
       pg_wal_lsn_diff(pg_current_wal_lsn(), :'lsn0') AS "这次提交写了多少字节 WAL",
       pg_walfile_name(pg_current_wal_lsn()) AS "写在哪个 WAL 文件里";

\echo '=== ③ synchronous_commit:每次提交都等 WAL 落盘(on),还是先返回、过一会儿再落盘(off)'
DROP TABLE IF EXISTS commit_bench;
CREATE TABLE commit_bench (id int);
\timing on
SET synchronous_commit = on;
DO $$ BEGIN FOR i IN 1..2000 LOOP INSERT INTO commit_bench VALUES (i); COMMIT; END LOOP; END $$;
SET synchronous_commit = off;
DO $$ BEGIN FOR i IN 1..2000 LOOP INSERT INTO commit_bench VALUES (i); COMMIT; END LOOP; END $$;
\timing off
RESET synchronous_commit;
SELECT count(*) AS "一共提交了几行" FROM commit_bench;
DROP TABLE commit_bench;
