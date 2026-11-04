-- Day 26 · 06:JSONB —— 一张自由格式的便条
SET search_path = day26;

-- json 原样保存文本;jsonb 解析后以二进制保存:去掉多余空白、重复的键只留最后一个、键按内部顺序排
SELECT '{"b": 1, "a": 2, "a": 3}'::json  AS json_原样,
       '{"b": 1, "a": 2, "a": 3}'::jsonb AS jsonb_规整后;

-- 给任务加一列 metadata:放「来源」「客户端信息」这类结构多变、很少单独查的东西
ALTER TABLE tasks ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}';
UPDATE tasks SET metadata = '{"source": "web", "client": {"browser": "Firefox", "version": 133}}' WHERE id = 1;
UPDATE tasks SET metadata = '{"source": "mobile", "client": {"os": "iOS"}, "labels": ["a", "b"]}' WHERE id = 3;
UPDATE tasks SET metadata = '{"source": "import", "import_batch": 42}' WHERE id = 4;

-- -> 取出来还是 jsonb;->> 取出来是 text
SELECT id, metadata -> 'client' AS client_jsonb, metadata ->> 'source' AS source_text,
       metadata -> 'client' ->> 'browser' AS browser
FROM tasks WHERE metadata <> '{}' ORDER BY id;

-- @> 包含:metadata 里有 {"source": "mobile"} 的任务;? 有没有这个键
SELECT id, title FROM tasks WHERE metadata @> '{"source": "mobile"}';
SELECT id, title FROM tasks WHERE metadata ? 'import_batch';

-- jsonb_set:改便条里的一个值(返回新的 jsonb,整列写回)
UPDATE tasks SET metadata = jsonb_set(metadata, '{client,version}', '134') WHERE id = 1 RETURNING metadata;

-- 便条上写什么,数据库都收:类型不对、键名拼错、引用一个不存在的用户……都不会报错
UPDATE tasks SET metadata = '{"source": 123, "sourse": "web", "assignee_id": 99999}' WHERE id = 6 RETURNING id, metadata;

-- 如果 checklist 存成 JSONB 数组:读写整份很方便
CREATE TEMP TABLE tasks_json AS
SELECT t.id, t.title,
       coalesce(jsonb_agg(jsonb_build_object('text', c.text, 'done', c.done) ORDER BY c.position)
                FILTER (WHERE c.task_id IS NOT NULL), '[]') AS checklist
FROM tasks t LEFT JOIN checklist_items c ON c.task_id = t.id
GROUP BY t.id;
SELECT id, title, checklist FROM tasks_json ORDER BY id;
-- 展开成行再统计:每个任务的清单完成数
SELECT id, title,
       jsonb_array_length(checklist) AS 总数,
       (SELECT count(*) FROM jsonb_array_elements(checklist) e WHERE (e ->> 'done')::boolean) AS 已完成
FROM tasks_json ORDER BY id;
-- 但每一项的规则(text 不能为空、不超过 100 字)数据库不帮你检查
UPDATE tasks_json SET checklist = checklist || '[{"text": "", "done": "maybe"}]' WHERE id = 2 RETURNING checklist;
-- 同样的坏数据,进子表会被约束拦下吗?(子表的 done 是 boolean)
INSERT INTO checklist_items (task_id, position, text, done) VALUES (2, 2, '', 'maybe');

-- 反过来:数据存在子表里,也能在读的时候拼成 API 要的 JSON 形状(Day 27 的仓储可以这样一次查出来)
SELECT t.id, t.title,
       coalesce(json_agg(json_build_object('text', c.text, 'done', c.done) ORDER BY c.position)
                FILTER (WHERE c.task_id IS NOT NULL), '[]') AS checklist
FROM tasks t LEFT JOIN checklist_items c ON c.task_id = t.id
WHERE t.id IN (2, 3, 4)
GROUP BY t.id
ORDER BY t.id;
