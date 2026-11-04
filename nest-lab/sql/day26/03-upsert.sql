-- Day 26 · 03:INSERT … ON CONFLICT(UPSERT)—— 「有就怎样,没有就新建」一句话完成
SET search_path = day26;
SET TIME ZONE 'UTC';

-- ① DO NOTHING:已经有了就什么都不做,不报错
INSERT INTO users (email, display_name) VALUES ('alice@example.com', 'Alice 2号')
ON CONFLICT (email) DO NOTHING;
-- 对比 Day 24:不写 ON CONFLICT 时是 23505 报错
INSERT INTO users (email, display_name) VALUES ('alice@example.com', 'Alice 2号');

-- ② DO UPDATE:已经有了就更新。「登录时:用户存在就更新最后登录时间,不存在就注册」
--    EXCLUDED 指的是「这次本来想插入的那一行」
INSERT INTO users (email, display_name, last_login_at) VALUES ('alice@example.com', 'Alice', '2026-11-04 09:00+00')
ON CONFLICT (email) DO UPDATE SET last_login_at = EXCLUDED.last_login_at;
INSERT INTO users (email, display_name, last_login_at) VALUES ('dave@example.com', 'Dave', '2026-11-04 09:05+00')
ON CONFLICT (email) DO UPDATE SET last_login_at = EXCLUDED.last_login_at;
SELECT id, email, display_name, last_login_at FROM users ORDER BY id;
-- 注意 Dave 的 id:前面三次插入 alice 的尝试(DO NOTHING、报错、DO UPDATE)各用掉了一个号(接 Day 24 的空洞)

-- ③ 冲突目标必须对应一个唯一约束 / 唯一索引
INSERT INTO users (email, display_name) VALUES ('bob@example.com', 'Bob')
ON CONFLICT (display_name) DO NOTHING;

-- ④ 标签「没有就建,有就复用」,并拿回它的 id
--    坑:DO NOTHING 时,已存在的那一行不会被 RETURNING 返回
INSERT INTO tags (name) VALUES ('urgent') ON CONFLICT (name) DO NOTHING RETURNING id, name;
INSERT INTO tags (name) VALUES ('work')   ON CONFLICT (name) DO NOTHING RETURNING id, name;
--    常见写法:先试着插,插不进去就再查一次(两步写在一条语句里)
WITH ins AS (
  INSERT INTO tags (name) VALUES ('urgent') ON CONFLICT (name) DO NOTHING RETURNING id
)
SELECT id FROM ins
UNION ALL
SELECT id FROM tags WHERE name = 'urgent' AND NOT EXISTS (SELECT 1 FROM ins);
SELECT id, name FROM tags ORDER BY id;
