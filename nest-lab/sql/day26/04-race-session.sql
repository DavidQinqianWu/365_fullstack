-- Day 26 · 04:用 UPSERT 改写 Day 24 的并发注册。由观察脚本同时启动两份(psql -v who=A / B)
-- 不再「先查后插」,直接插;已经存在就什么都不做,并用 RETURNING 告诉我「这次到底插进去没有」
SET search_path = day26;
BEGIN;
-- 和 Day 24 一样,在插入之前停 1 秒,让两个请求的时间窗口重叠
SELECT pg_sleep(1) AS slept \gset
INSERT INTO signups (email, who) VALUES ('erin@example.com', :'who')
ON CONFLICT (email) DO NOTHING
RETURNING id, who AS 插入成功的是;
COMMIT;
