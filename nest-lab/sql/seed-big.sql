-- nest-lab 的「真实规模」种子数据(Day 34):30 万任务 + 24 万条清单项
-- 用法:npm run db:seed:big(= psql -v schema=app -f sql/schema.sql -f sql/seed-big.sql)
-- ⚠️ 会先由 schema.sql DROP 整个 schema;不要对 e2e:pg 用的 app_test 跑(db-reset.mjs 会拒绝)。
--
-- 分布尽量像真的待办:
--   · 标题一半英文、一半中文(汉字之间没有空格),约 0.1% 带「(加急)」、约 0.1% 带「 urgent」
--   · created_at 从 2024-01-01 起每 3 分钟左右一条,越早的任务越可能已完成(整体约 80% 已完成)
--   · 40% 的任务有 1–5 条清单项
-- setseed 保证每次生成的数据完全相同。
\set ON_ERROR_STOP on
SET search_path = :"schema";
SET client_min_messages = warning;

SELECT setseed(0.34);
INSERT INTO tasks (title, done, created_at)
WITH g AS (
  SELECT n, random() AS r1, random() AS r2, random() AS r3, random() AS r4
  FROM generate_series(1, 300000) AS n
)
SELECT CASE WHEN r1 < 0.5
         THEN (ARRAY['Fix', 'Write', 'Review', 'Deploy', 'Update', 'Refactor', 'Test', 'Design', 'Migrate', 'Document'])[1 + floor(r2 * 10)::int] || ' ' ||
              (ARRAY['login page', 'payment API', 'user report', 'search box', 'invoice export', 'dashboard chart', 'email template', 'mobile layout', 'cache layer', 'database index'])[1 + floor(r3 * 10)::int]
         ELSE (ARRAY['修复', '编写', '评审', '部署', '更新', '重构', '测试', '设计', '迁移', '整理'])[1 + floor(r2 * 10)::int] ||
              (ARRAY['登录页', '支付接口', '用户报表', '搜索框', '发票导出', '仪表盘图表', '邮件模板', '移动端布局', '缓存层', '数据库索引'])[1 + floor(r3 * 10)::int]
       END
       || CASE WHEN r4 < 0.001 THEN '(加急)' WHEN r4 < 0.002 THEN ' urgent' ELSE '' END
       || ' ' || n,
       -- 越早越可能完成:最早的约 95%,最新的约 50%
       r4 < 0.95 - 0.45 * n / 300000.0,
       timestamptz '2024-01-01 00:00+00' + n * interval '3 minutes' + r1 * interval '60 seconds'
FROM g;

-- 清单项:由任务 id 决定(不用 random,结果稳定):id % 5 < 2 的任务有 1–5 条
INSERT INTO checklist_items (task_id, position, text, done)
SELECT t.id, p, '步骤 ' || p, t.done OR p = 1
FROM tasks t
CROSS JOIN LATERAL generate_series(1, CASE WHEN t.id % 5 < 2 THEN 1 + (t.id * 7) % 5 ELSE 0 END) AS p;

VACUUM ANALYZE tasks;
VACUUM ANALYZE checklist_items;
SELECT (SELECT count(*) FROM tasks) AS 任务数,
       (SELECT count(*) FROM checklist_items) AS 清单项数,
       (SELECT round(100.0 * count(*) FILTER (WHERE NOT done) / count(*), 1) FROM tasks) AS "未完成 %",
       pg_size_pretty(pg_total_relation_size('tasks')) AS "tasks 合计(含索引)";
