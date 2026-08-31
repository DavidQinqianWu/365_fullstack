// Day 2 · 习题 3:饿死 event loop vs 安全让出
// 目标:理解为什么「让出必须用 setImmediate,绝不能用 nextTick」
// 运行:npx tsx src/02-event-loop-phases/ex3-starve-the-loop.ts
//
// ⚠️ 注意:CASE 1 会真的把进程卡死,所以默认被注释掉了。
//    先跑 CASE 2 观察正常行为,再取消注释 CASE 1(跑 3 秒内 Ctrl+C 杀掉)。

console.log("按下 500ms 后的取餐铃 🔔");
let bellRang = false;
setTimeout(() => {
  bellRang = true;
  console.log("执行铃铛, 因为🔔 铃响了!");
}, 500);

// ---------- CASE 1:递归 nextTick —— 店长疯狂插单,服务员永远开不了工 ----------
// 取消下面这段注释前,先预测:铃铛还能响吗?
// 不能
//
// let tickCount = 0;
// function keepCuttingInLine() {
//   tickCount++;
//   if (tickCount % 1_000_000 === 0) console.log(`店长已插单 ${tickCount / 1_000_000} 百万次……`);
//   process.nextTick(keepCuttingInLine); // 每次清场又往同一队列塞新单
// }
// keepCuttingInLine();

// ---------- CASE 2:递归 setImmediate —— 每片干完主动让服务员巡场一圈 ----------
// 模拟一个大计算任务(磨 6 亿次面粉,约 1 秒),切成 60 片,片间让出
const TOTAL = 600_000_000;
const CHUNK = 10_000_000;
let done = 0;

console.time("分片磨面粉总耗时");
function grindChunk() {
  console.log(`🍜 正在磨面粉:已磨 ${done / 1_000_000} 百万次……`);
  const end = Math.min(done + CHUNK, TOTAL);
  while (done < end) {
    Math.sqrt(done); // 磨面粉(假装在计算)
    done++;
  }
  if (done < TOTAL) {
    setImmediate(grindChunk); // 下一片放进下一轮 check 站,本轮照常走完
  } else {
    console.timeEnd("分片磨面粉总耗时");
    // 铃铛(500ms)如果抢在"磨完"之前响了,说明分片期间 loop 一直在正常巡场
    console.log(
      bellRang
        ? "🍜 面粉磨完了 —— 注意:铃铛在磨面粉【期间】就正常响过了!"
        : "🍜 面粉磨完了 —— 但铃铛被拖到了磨完之后才响(loop 被堵了)",
    );
  }
}
grindChunk();

// 思考题(写在 notes.md):
// 1. CASE 1 里铃铛为什么永远不响?(提示:nextTick 队列是"完全排空才放行",
//    而每次排空又会塞进新单……)
// answer: 因为在 CASE 1 中,每次执行完 nextTick 队列中的任务后,又会立即将新的任务加入队列,导致队列永远不会被清空,从而阻塞了事件循环,铃铛的回调函数无法被执行,所以铃铛永远不响。

// 2. CASE 2 里铃铛为什么能按时响?setImmediate 注册的下一片排在哪一站?
// answer: 因为在 CASE 2 中,每次执行完一片磨面粉的任务后,会使用 setImmediate 将下一片任务加入到 check 阶段的队列中,这样事件循环可以正常巡场,从而允许铃铛的回调函数在 500ms 后被执行,所以铃铛能按时响。
// 3. 如果 CASE 2 改用 process.nextTick 分片,会发生什么?这说明了什么工程规则?
// answer: 如果 CASE 2 改用 process.nextTick 分片,会发生和 CASE 1 一样的情况,即铃铛永远不响。这说明了一个工程规则:在处理 CPU 密集型任务时,应该使用 setImmediate 或其他异步机制来分片任务,以避免阻塞事件循环,从而确保其他异步任务能够被及时执行。
// 4. 分片只是"止血"。生产环境里 CPU 密集任务的治本方案是什么?(Day 1 提过)
// answer: 生产环境里 CPU 密集任务的治本方案是使用多线程或多进程来处理这些任务,将它们分配到不同的线程或进程中执行,从而避免阻塞主线程的事件循环,确保应用程序的响应性和性能。 例如webworker中
//
// ✅ 订正:方向对(多线程/多进程),但术语要校准 —— Web Worker 是【浏览器】里的;
//    Node.js 里的对应物是 worker_threads(Day 1 面馆比喻里「另雇一个磨粉工」),
//    或者子进程(child_process)。面试时说 "Node 里用 worker_threads" 才准确。
