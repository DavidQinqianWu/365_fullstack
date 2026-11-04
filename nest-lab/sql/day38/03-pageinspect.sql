-- Day 38 · 03:用 pageinspect 直接看数据页上的每个行版本(包括已经看不见的)
-- ⚠️ get_raw_page / heap_page_items 只有超级用户能用。本机用法:
--   sudo -u postgres psql -d nest_lab -f sql/day38/03-pageinspect.sql
-- Docker:docker compose exec postgres psql -U "$POSTGRES_USER" -d nest_lab -f /sql/day38/03-pageinspect.sql(POSTGRES_USER 是超级用户;未实测)
-- lp_flags:1 = 正常,2 = 重定向(HOT 链的入口),3 = 已死(只剩一个空位),0 = 空闲
SET search_path = day38;
SET client_min_messages = warning;
CREATE EXTENSION IF NOT EXISTS pageinspect WITH SCHEMA public;

\echo '=== ① items 第 0 页:每个行版本的 xmin / xmax / 指向的 ctid'
SELECT lp, lp_flags, t_xmin, t_xmax, t_ctid,
       CASE WHEN t_infomask2 & 16384 <> 0 THEN '被 HOT 更新过' ELSE '' END AS hot,
       CASE WHEN t_infomask2 & 32768 <> 0 THEN 'HOT 新版本' ELSE '' END AS heap_only
FROM public.heap_page_items(public.get_raw_page('day38.items', 0));

\echo '=== ② VACUUM 之后再看:死掉的版本被清理,位置空出来'
VACUUM day38.items;
SELECT lp, lp_flags, t_xmin, t_xmax, t_ctid FROM public.heap_page_items(public.get_raw_page('day38.items', 0));
