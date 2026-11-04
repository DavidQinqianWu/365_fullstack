-- Day 26 · 04:并发注册实验的准备 —— 一张邮箱有唯一约束的注册表(和 Day 24 的 signup_uk 一样)
SET search_path = day26;
DROP TABLE IF EXISTS signups;
CREATE TABLE signups (
  id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  who   text,
  CONSTRAINT signups_email_key UNIQUE (email)
);
