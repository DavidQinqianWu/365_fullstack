-- Day 24 · 07:「先查后插」拦不住并发注册 —— 准备两张注册表
-- signup_no_uk:没有唯一约束,只靠应用「先查有没有,没有再插」
-- signup_uk:   同样的流程,但邮箱上有唯一约束
SET search_path = day24;
DROP TABLE IF EXISTS signup_no_uk, signup_uk;
CREATE TABLE signup_no_uk (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, email text NOT NULL, who text);
CREATE TABLE signup_uk (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  who text,
  CONSTRAINT signup_uk_email_key UNIQUE (email)
);
