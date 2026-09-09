# 水平测试 · Level Check(约 90 分钟)

> 目的:找出你在 7 个领域里的真实起点,用来重排 roadmap。
> 规则:不查资料,不用 AI。不会就写「不会」,这比猜更有用。
> 回答直接写在每题下面。中英文都可以。代码题写在 `src/00-level-check/` 里。

## 批改结果(Day 4)

| 领域 | 得分 |
|---|---|
| A 后端基础 | 1 / 10(A5 方向对、细节反:CORS 挡的是「读响应」,不是「发请求」)|
| B 数据库 | 0 / 10 |
| C API 设计 | 0 / 4 |
| D 云 / Docker / DevOps | 0 / 12 |
| E 代码设计 | 0 / 6 |
| F 系统设计 | 0 / 6 |
| G React / TS | 0 / 4(确认为真实缺口)|
| **总分** | **1 / 46 → 后端从零** |

复答记录:每个 Phase 结束重答对应题目,在下方各题后追加「Phase N 复答:x/2」。

## 评分方法(自评或交给我评)

每题 0 / 1 / 2 分:

- 0 = 不会或答错
- 1 = 知道大概,说不清细节
- 2 = 能讲清原理,也能说出一个坑

---

## A. 后端基础(Backend Fundamentals)

**A1.** `POST`、`PUT`、`PATCH` 三个方法哪些是幂等的?为什么幂等对「客户端重试」很重要?
0
**A2.** 用户提交表单,字段校验失败。你返回什么 HTTP 状态码?响应体长什么样?
0
**A3.** 一个 Node.js API 有一个接口要做 2 秒的 CPU 计算(比如生成 PDF)。1000 个用户同时调用会发生什么?给出两种解决方案。
0
**A4.** 一个 JWT 由哪三部分组成?服务器怎么验证它没被篡改?用户点「退出登录」后,JWT 怎么失效?
0
**A5.** 什么是 CORS?它是保护服务器还是保护用户?
1 CORS是用来保护用户的, 跨域. 是让不允许其他domain的API请求跑到另一个domain下提交数据. 比如: 钓鱼网站, 会把你的账号密码发送到另一个domain 通过api去发送, 这样就不行, 所以浏览器有个CORS协议, 浏览器当看到你去 POST/GET别的网页的api数据, 就会拒绝

---

## B. 数据库(Database)

**B1.** 表 `users(id, name)`、`orders(id, user_id, amount, created_at)`。写 SQL:找出最近 30 天下单总金额最高的 3 个用户,输出用户名和总金额。
0
**B2.** `email` 列有索引。查询 `WHERE email LIKE '%@gmail.com'` 为什么不走索引?怎么办?
0
**B3.** 库存只剩 1 件,两个用户同时下单。不加保护会发生什么?给出两种不同的解决办法(提示:一种靠数据库锁,一种不靠锁)。
0
**B4.** 什么是 N+1 查询问题?举一个例子,再说怎么修。
0
**B5.** 什么时候你会选 Redis 而不是 PostgreSQL 存数据?举两个场景。
0

---

## C. API 设计(REST / GraphQL)

**C1.** GraphQL 相比 REST 解决了什么问题?它带来了哪两个新问题?
0
**C2.** 一个列表接口要支持分页。「页码分页」和「游标(cursor)分页」有什么区别?什么时候必须用游标?
0

---

## D. 云服务器 / Docker / DevOps

**D1.** 在你的 Hetzner 服务器上,用什么命令查看:(a) 哪个进程占用了 80 端口 (b) 磁盘剩余空间 (c) 最近的系统日志?
0
**D2.** 给一个 Node.js + TypeScript 项目写一个 Dockerfile。要求:生产镜像不包含 devDependencies。写完后回答:为什么先 `COPY package.json` 再 `COPY . .`?
0
**D3.** 你有一个 API + PostgreSQL + Redis。用 docker compose 写出编排文件的骨架(不要求能跑,写出结构)。
0
**D4.** 给 Hetzner 上的服务加 HTTPS,域名已经有了。说出你的步骤和工具。
0
**D5.** 一个 GitHub Actions 流水线,在部署到服务器之前应该做哪些步骤?部署到 Hetzner 的动作本身你会怎么做?
0
**D6.** 你什么时候**不**需要 Kubernetes?
0

---

## E. 代码设计(Code Design)

**E1.** 下面这个函数有什么问题?你会怎么拆?拆完以后怎么测试它?

```ts
async function createOrder(req, res) {
  if (!req.body.items?.length) return res.status(400).send("empty");
  const total = req.body.items.reduce((s, i) => s + i.price * i.qty, 0);
  const order = await db.query("INSERT INTO orders ... RETURNING *", [
    req.user.id,
    total,
  ]);
  await stripe.charges.create({ amount: total, customer: req.user.stripeId });
  await sendgrid.send({ to: req.user.email, subject: "Order confirmed" });
  res.json(order);
}
```

0
**E2.** 用三句话解释「依赖注入(Dependency Injection)」。它和「写测试」有什么关系?
0
**E3.** 「分层架构」里,业务逻辑层为什么不应该 import 数据库驱动或 HTTP 框架?
0

---

## F. 系统设计(System Design)

**F1.** 设计一个短链接服务(URL shortener)。用不超过 10 句话写出:组件、短码怎么生成、数据存哪、怎么加速读取、怎么应对热点链接。
0
**F2.** 你的 API 在 100 请求/秒时变慢,瓶颈在数据库。列出 4 个你会按顺序尝试的办法,并说明为什么是这个顺序。
0
**F3.** 什么是负载均衡器(load balancer)?一台 Hetzner 服务器上跑 4 个 Node 进程,需要负载均衡器吗?
0

---

## G. React / TypeScript(前端只测这两题)

**G1.** 下面的代码在快速切换 `userId` 时会出 bug。是什么 bug?怎么修?

```tsx
useEffect(() => {
  fetch(`/api/users/${userId}`)
    .then((r) => r.json())
    .then(setUser);
}, [userId]);
```

0
**G2.** 写一个 TS 类型 `ApiResponse<T>`:成功时有 `data: T`,失败时有 `error: { code: string; message: string }`。要求:调用方通过一个字段就能让 TS 自动收窄类型。
0

---

## H. 动手题(可选,30 分钟)

**H1.** 在 `src/00-level-check/token-bucket.ts` 里用 TypeScript 实现一个令牌桶限流器(token bucket):每秒补 10 个令牌,桶容量 20,提供 `tryAcquire(): boolean`。附一个能跑的自检。
0

---

## 分数区间 → 下一步

| 总分(满分 46,不含 H) | 判断           | roadmap 调整方向                                   |
| -------------------- | -------------- | -------------------------------------------------- |
| 0–15                 | 后端基础从零   | Phase 1–2 保持慢速,DevOps 从 Day 45 开始           |
| 16–30                | 有概念,缺动手  | 缩短概念周,Day 30 上 Hetzner,项目驱动              |
| 31–46                | 已接近中级后端 | 跳过 Phase 1 剩余,直接进数据库 + 部署,系统设计提前 |
