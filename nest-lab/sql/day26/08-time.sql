-- Day 26 · 08:timestamptz vs timestamp
SET search_path = day26;
DROP TABLE IF EXISTS time_demo;
CREATE TABLE time_demo (label text, at_tz timestamptz, at_plain timestamp);

-- 同一时刻:北京时间 2026-11-04 17:00(= 世界时 09:00),分别写进两种类型
SET TIME ZONE 'Asia/Shanghai';
INSERT INTO time_demo VALUES ('上海的会话写入', '2026-11-04 17:00', '2026-11-04 17:00');

-- 换成柏林的会话来读
SET TIME ZONE 'Europe/Berlin';
SELECT label, at_tz, at_plain FROM time_demo;
SET TIME ZONE 'UTC';
SELECT label, at_tz, at_plain FROM time_demo;
-- timestamptz 读出来的是同一个时刻,只是按会话时区换了个写法;timestamp 只是一串「墙上的数字」,不知道是哪里的 17 点
SELECT at_tz AT TIME ZONE 'Asia/Shanghai' AS 换成上海墙上时间, at_tz AT TIME ZONE 'Europe/Berlin' AS 换成柏林墙上时间 FROM time_demo;

-- 柏林的会话写入同一串数字,timestamp 和上海那一行完全分不出来
SET TIME ZONE 'Europe/Berlin';
INSERT INTO time_demo VALUES ('柏林的会话写入', '2026-11-04 17:00', '2026-11-04 17:00');
SET TIME ZONE 'UTC';
SELECT label, at_tz, at_plain FROM time_demo ORDER BY label;
SELECT max(at_tz) - min(at_tz) AS 两个timestamptz相差, max(at_plain) - min(at_plain) AS 两个timestamp相差 FROM time_demo;

-- 夏令时:柏林 2026-03-29 凌晨 2 点直接跳到 3 点。从前一天中午加「1 天」和加「24 小时」不一样
SET TIME ZONE 'Europe/Berlin';
SELECT timestamptz '2026-03-28 12:00' + interval '1 day'    AS 加一天,
       timestamptz '2026-03-28 12:00' + interval '24 hours' AS 加24小时;
SELECT (timestamptz '2026-03-28 12:00' + interval '1 day') - timestamptz '2026-03-28 12:00' AS 一天其实有多长;

-- 应用里最常用的输出:ISO 8601 + UTC(Day 18 的 createdAt 就是这个格式)
SET TIME ZONE 'UTC';
SELECT to_char(at_tz, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS iso_utc FROM time_demo ORDER BY label;
