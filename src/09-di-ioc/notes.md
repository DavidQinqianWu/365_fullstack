# Day 9 概念卡默写(习题 4)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。
> nest-lab 里的改动见讲义第 2 节;这个目录放迷你 IoC 容器(`mini-container.ts`、`ex1-mini-ioc.ts`)和这份笔记。

## 1. 一个只写过前端的同事问你:"Nest 的依赖注入是啥?和 React 的 Context、Angular 的 DI 像吗?为什么不直接 import 一个实例来用?"用餐厅比喻给他讲清楚,并说出比喻在哪里会骗人。

(在这里写)



## 2. IoC 容器启动时做了哪几步?为什么 `TasksService` 的构造函数必须写 `@Inject(TASKS_REPOSITORY)`,而 `TasksController` 不用写?

(在这里写)



## 3. singleton / request / transient 各造几个?什么叫作用域「传染」,代价是什么?为什么「单例」在两个副本里其实是两个?

(在这里写)



---

## ✍️ 预测区(习题 1–3:先写预测,再运行,再批改)

- 习题 1 · 第 1 幕:A 前台建了任务,B 前台看到几个?
- 习题 1 · 第 2 幕:「🆕 造好」的打印顺序?
- 习题 1 · 第 3 幕:再要一次还会打印「🆕」吗?是同一个对象吗?
- 习题 1 · 第 4 幕:换 FakeRepo,Controller / Service 要改几行?
- 习题 1 · 第 5 幕:循环依赖的报错长什么样?
- 习题 2 · 3 个请求后各被 new 几次:SingletonCounter __ / RequestCounter __ / TransientCounter __ / ReportService __ / ScopeDemoController __
- 习题 2 · 开店时(请求前)打印哪几行「🆕」?
- 习题 2 · 去掉 `Scope.REQUEST` 之后,五个数字变成:
- 习题 3 · 删掉 `@Inject(CLOCK)`:启动就失败,还是第一个请求才失败?
- 习题 3 · 固定时钟后,样品任务的 createdAt 会跟着变吗?

---

## 📒 我的理解笔记(做题时的讨论/顿悟,随时记)

(空白,等你来写)

---

## 订正区(对完答案后把说错的地方写在这)

(空白)
