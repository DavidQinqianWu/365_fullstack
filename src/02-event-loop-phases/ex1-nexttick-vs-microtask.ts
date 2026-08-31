// Day 2 · 习题 1:清场顺序 —— 同步 vs nextTick vs microtask
// 目标:亲眼看到「每站服务完客人后的清场顺序」,并发现 ESM 顶层的反序彩蛋
// 运行:npx tsx src/02-event-loop-phases/ex1-nexttick-vs-microtask.ts
//
// 【先预测,再运行 —— 在下方写出你预测的执行顺序(用编号)】
// 我的预测:1.6.2.5.3.4
// 实际输出:1.6.3.4.2.5
// 预测对了吗?哪里反直觉? answer: 为什么 nextTick 的 [2][5] 反而跑在了 microtask 的 [3][4] 后面? 这就是 ESM 顶层的反序彩蛋,在 CJS 中 nextTick 会优先于 microtask。

// 注意:本项目 "type": "module",这个文件是 ES module(ESM)。
// 标签按【注册顺序】编号,输出的乱序就是真实调度顺序。

process.nextTick(() => console.log("[2] nextTick:店长的插单,第 1 个"));
Promise.resolve().then(() => console.log("[3] promise.then:microtask,第 1 个"));
queueMicrotask(() =>
  console.log("[4] queueMicrotask:microtask,第 2 个(FIFO 排 promise 后面)"),
);
process.nextTick(() => console.log("[5] nextTick:店长的插单,第 2 个"));

console.log("[1] 同步:顶层代码开始");
console.log("[6] 同步:顶层代码结束");

// 思考题(写在 notes.md):
// 1. 为什么同步代码 [1][6] 明明注册在最后,却最先执行?
// answer: 因为同步代码在事件循环的执行阶段中是最先执行的,它们会在任何异步任务之前执行,所以即使它们在代码中注册得晚,也会最先执行。

// 2. microtask([3][4])为什么跑赢了先注册的 nextTick([2][5])?
//    提示:这个文件是 ESM 还是 CJS?两种模块的清场顺序一样吗?
// answer: 这个文件是 ESM,在 ESM 中 microtask 的清场顺序优先于 nextTick,而在 CJS 中 nextTick 会优先于 microtask。

// 3. 如果把这段代码原样放进一个 I/O 回调里(比如 fs.readFile 的回调),
//    nextTick 和 microtask 的顺序会变吗?为什么?
// answer(我的原答案,❌ 错了): 不会变……清场顺序都是一样的
//
// ✅ 订正(2026-08-31 实测验证):顺序会变!I/O 回调里输出是 [2][5][3][4],
//    nextTick 重新跑到 microtask 前面。关键在「谁主导清场」:
//    - ESM 顶层:模块求值由 V8 驱动,求值结束 V8 立刻排空自家的 microtask 队列,
//      Node 的 nextTick 处理在更外层 → microtask 先(顶层特例)。
//    - 普通回调内(I/O、timer):JS 栈清空后由 Node 主导清场,
//      恢复经典顺序 → nextTick 先,microtask 后。
//    一句话:「microtask 优先」只是 ESM 顶层特例;进了回调,nextTick 永远优先。
