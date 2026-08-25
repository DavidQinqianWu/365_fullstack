// Day 2 · 习题 1:清场顺序 —— 同步 vs nextTick vs microtask
// 目标:亲眼看到「每站服务完客人后的清场顺序」,并发现 ESM 顶层的反序彩蛋
// 运行:npx tsx src/02-event-loop-phases/ex1-nexttick-vs-microtask.ts
//
// 【先预测,再运行 —— 在下方写出你预测的执行顺序(用编号)】
// 我的预测:____________________________________
// 实际输出:____________________________________
// 预测对了吗?哪里反直觉?_________________________

// 注意:本项目 "type": "module",这个文件是 ES module(ESM)。
// 标签按【注册顺序】编号,输出的乱序就是真实调度顺序。

process.nextTick(() => console.log("[2] nextTick:店长的插单,第 1 个"));
Promise.resolve().then(() => console.log("[3] promise.then:microtask,第 1 个"));
queueMicrotask(() => console.log("[4] queueMicrotask:microtask,第 2 个(FIFO 排 promise 后面)"));
process.nextTick(() => console.log("[5] nextTick:店长的插单,第 2 个"));

console.log("[1] 同步:顶层代码开始");
console.log("[6] 同步:顶层代码结束");

// 思考题(写在 notes.md):
// 1. 为什么同步代码 [1][6] 明明注册在最后,却最先执行?
// 2. microtask([3][4])为什么跑赢了先注册的 nextTick([2][5])?
//    提示:这个文件是 ESM 还是 CJS?两种模块的清场顺序一样吗?
// 3. 如果把这段代码原样放进一个 I/O 回调里(比如 fs.readFile 的回调),
//    nextTick 和 microtask 的顺序会变吗?为什么?
