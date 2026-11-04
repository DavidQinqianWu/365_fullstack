-- Day 27 · SQL 注入实验用的两张表(独立的 schema day27_demo,和应用的表无关;可以反复重建)
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS day27_demo CASCADE;
CREATE SCHEMA day27_demo;
-- 每个人只该看到自己的笔记
CREATE TABLE day27_demo.notes (id integer PRIMARY KEY, owner text NOT NULL, body text NOT NULL);
INSERT INTO day27_demo.notes VALUES
  (1, 'alice', '周一:买菜'), (2, 'alice', '周二:学 SQL 注入'), (3, 'bob', 'Bob 的私人笔记:银行卡密码提示');
-- 一张接口根本不该碰到的表
CREATE TABLE day27_demo.api_keys (id integer PRIMARY KEY, label text NOT NULL, secret text NOT NULL);
INSERT INTO day27_demo.api_keys VALUES (1, '支付网关', 'DEMO-SECRET-not-a-real-key');
