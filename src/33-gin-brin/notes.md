# Day 33 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> 今天的实验都在 `nest-lab/` 里(`sql/day33/`、`scripts/day33-try.mjs`),这个目录只放预测、方案和默写。

## 1. 一个只写过前端的同事说:"我的搜索框就是 `items.filter(x => x.title.includes(q))`,数据多了就卡;Algolia 和浏览器的 Ctrl+F 是怎么做到快的?数据库里的 `LIKE '%q%'` 为什么也慢?"用书末关键词索引的比喻讲清楚倒排索引和三元组,并说出这个比喻在哪里会骗人。

(在这里写)



## 2. trigram 和全文搜索各自找的是什么?各举一个对方做不到的例子。为什么 nest-lab 的 `?q=` 选 trigram?

(在这里写)



## 3. BRIN 存的是什么?为什么它只有几十 KB?什么情况下它会失效?

(在这里写)



---

## ✍️ 预测区(习题 1–3:先写预测,再运行,再批改)

- 普通 B-tree 能用上 `LIKE 'Fix invoice%'` 吗?`text_pattern_ops` / `COLLATE "C"` 呢?`'%invoice%'`、`ILIKE 'fix invoice%'` 呢?
- `show_trgm('发票导出')`、`show_trgm('登录')` 输出什么?
- trigram GIN 多大?`'%urgent%'`、`'%invoice%'`、`'%发票导出%'`、`'%加急%'`、`'%(加急)%'` 各快多少?
- nest-lab 的 `title ILIKE $1 ESCAPE '\'` 能用上 GIN 吗?
- `dashbord` / `paymnet` 能模糊匹配到吗?
- `owner_id = 2` 能进 btree_gin 索引的 Index Cond 吗?
- `to_tsvector('english', 'Running the payment APIs quickly')` 剩下哪几个词?中文能搜到「发票」吗?
- 搜 voice 和 exports,trigram 和全文搜索各找到几行?
- `jsonb_ops` 和 `jsonb_path_ops` 哪个小?`meta ? 'due'` 都能用吗?
- 插入 10 万行:没有索引 / B-tree / GIN(fastupdate 开、关)各多久、多少 WAL?
- BRIN 多大?查一天比 B-tree 慢多少?打乱以后呢?
- 习题 1 · `'%invoice export%'`、正则 `~*`、`'%登录页%'` vs `'%登录%'`:
- 习题 2 · 三个需求的索引选择:
- 习题 3 · nest-lab `?q=` 的方案(Day 34 要用):

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
