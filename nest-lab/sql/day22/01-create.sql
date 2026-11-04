-- Day 22 · 01:建第一张表(在 psql 里运行:\i sql/day22/01-create.sql,或 psql -f)
-- 今天只用最基础的类型;类型的细节(text vs varchar、timestamptz 的时区坑)留到 Day 26,
-- 主键怎么选(identity / serial / UUID)、NOT NULL / CHECK 等约束留到 Day 24。

DROP TABLE IF EXISTS tasks;          -- 让这个文件可以反复运行(⚠️ 会删掉整张表和里面的数据)

CREATE TABLE tasks (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- 由数据库发号:1, 2, 3…(Day 24 细讲)
  title      text,                                              -- 文本,长度不限
  done       boolean DEFAULT false,                             -- 不给就是 false
  created_at timestamptz DEFAULT now()                          -- 不给就是「现在」(带时区的时间点)
);

-- 看看表长什么样(psql 的元命令,不是 SQL,所以不需要分号)
\d tasks
