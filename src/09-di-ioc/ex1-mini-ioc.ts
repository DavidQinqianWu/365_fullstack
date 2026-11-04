// 习题 1:手写迷你 IoC 容器,看清「注册 → 解析依赖图 → 实例化 → 注入」
//
// 跑:npx tsx src/09-di-ioc/ex1-mini-ioc.ts
//
// ✍️ 预测(先写在 notes.md 的预测区,再运行):
//   第 1 幕:两个前台各自 new 一个后厨,A 前台新建的任务,B 前台能看到吗?
//   第 2 幕:resolve(TasksController) 时,「🆕 造好」会按什么顺序打印?Controller 第一个还是最后一个?
//   第 3 幕:再 resolve 一次 TasksController,还会打印「🆕」吗?两次拿到的是同一个对象吗?
//   第 4 幕:把仓储换成 FakeRepo,TasksController / TasksService 的代码要改几行?
//   第 5 幕:A 需要 B、B 需要 A,报错信息会是什么样?
import { Container, type Token } from "./mini-container.ts";

// ---------- 一组和 nest-lab 同形状的类(普通 TS,没有任何装饰器) ----------
type Task = { id: number; title: string; createdAt: string };
interface Clock { now(): Date }
interface TasksRepository { insert(title: string, createdAt: string): Task; count(): number }

const CLOCK = Symbol("CLOCK"); // 接口在运行时不存在,所以用一个 Symbol 当「工牌号」
const TASKS_REPOSITORY = Symbol("TASKS_REPOSITORY");

class InMemoryTasksRepository implements TasksRepository {
  private readonly rows: Task[] = [];
  insert(title: string, createdAt: string): Task {
    const task = { id: this.rows.length + 1, title, createdAt };
    this.rows.push(task);
    return task;
  }
  count(): number { return this.rows.length; }
}

class FakeRepo implements TasksRepository {
  insert(title: string, createdAt: string): Task { return { id: 999, title: `[假] ${title}`, createdAt }; }
  count(): number { return 0; }
}

class TasksService {
  static inject = [TASKS_REPOSITORY, CLOCK]; // 声明:我的构造函数依次需要这两样
  constructor(private readonly repo: TasksRepository, private readonly clock: Clock) {}
  create(title: string): Task { return this.repo.insert(title, this.clock.now().toISOString()); }
  count(): number { return this.repo.count(); }
}

class TasksController {
  static inject = [TasksService];
  constructor(readonly tasksService: TasksService) {}
}

const fixedClock: Clock = { now: () => new Date("2026-01-01T00:00:00.000Z") };

// ---------- 第 1 幕:不用容器,每个前台自己 new ----------
console.log("========== 第 1 幕:自己 new ==========");
const serviceA = new TasksService(new InMemoryTasksRepository(), fixedClock); // 前台 A 自己招后厨
const serviceB = new TasksService(new InMemoryTasksRepository(), fixedClock); // 前台 B 也自己招一个
serviceA.create("A 前台下的单");
console.log("A 看到的任务数:", serviceA.count(), "| B 看到的任务数:", serviceB.count());

// ---------- 第 2 幕:交给容器 ----------
console.log("\n========== 第 2 幕:注册 + resolve(TasksController) ==========");
const container = new Container().register(
  { provide: CLOCK, useValue: fixedClock },                     // useValue:现成的东西直接放进去
  { provide: TASKS_REPOSITORY, useClass: InMemoryTasksRepository }, // useClass:token → 用哪个类造
  { provide: "APP_NAME", useFactory: (clock: Clock) => `nest-lab@${clock.now().getFullYear()}`, inject: [CLOCK] },
  TasksService,                                                 // 简写:类本身就是 token
  TasksController,
);
const ctrl = container.resolve<TasksController>(TasksController);
console.log("APP_NAME =", container.resolve<string>("APP_NAME"));

// ---------- 第 3 幕:单例缓存 ----------
console.log("\n========== 第 3 幕:再要一次 ==========");
const ctrl2 = container.resolve<TasksController>(TasksController);
console.log("同一个 Controller 吗?", ctrl === ctrl2);
ctrl.tasksService.create("第一单");
console.log("另一个入口拿到的 TasksService 看到的任务数:", container.resolve<TasksService>(TasksService).count());

// ---------- 第 4 幕:换人不改前台 ----------
console.log("\n========== 第 4 幕:把仓储换成 FakeRepo ==========");
const testContainer = new Container().register(
  { provide: CLOCK, useValue: fixedClock },
  { provide: TASKS_REPOSITORY, useClass: FakeRepo }, // ← 只改了这一行
  TasksService,
  TasksController,
);
console.log(testContainer.resolve<TasksController>(TasksController).tasksService.create("测试单"));

// ---------- 第 5 幕:出错的两种情况 ----------
console.log("\n========== 第 5 幕:循环依赖 & 忘了注册 ==========");
class A { static inject: Token[] = []; }
class B { static inject = [A]; } // B 需要 A
A.inject = [B];                  // A 需要 B(类定义时 B 还不存在,只能事后补上)
try {
  new Container().register(A, B).resolve(A);
} catch (e) {
  console.log("❌", (e as Error).message);
}
try {
  new Container().register(TasksService, TasksController).resolve(TasksController);
} catch (e) {
  console.log("❌", (e as Error).message);
}
