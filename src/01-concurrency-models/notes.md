# Day 1 概念卡默写(习题 3)

> 规则:合上 HTML 文档,用自己的话写,每题不超过 5 句。写完再对答案、订正。

## 1. 并发和并行有什么区别?用面馆的例子说明。

并发: 表示

## 2. 为什么 Node.js 特别怕 CPU 密集任务,而 Java/C# 的多线程模型相对不怕?Go 又是怎么"两头占便宜"的?

(在这里作答)

---

## 📒 我的理解笔记:await 和 .then() 是同一件事的两种写法

(来自做 ex2 时的讨论,原话记录)

**核心理解:`await` 是一道分界线。它之后的所有代码(一直到当前函数结束),会被整体打包成"纸条",挂到被 await 的那个 Promise 的铃铛后面执行。**

```ts
const p = readFile(BIG_FILE, "utf-8"); // 递单,先不等
console.log("B 递完单子,服务员马上去招呼下一桌了 🏃");
await p;
// 下面三行概念上等价于被打包扔到了 p 之后执行:
console.timeEnd("B 异步读文件");
console.log("B 读完了 🎉");
await cleanupFile();

// 等价于:
p.then(() => {
  console.timeEnd("B 异步读文件");
  console.log("B 读完了 🎉");
  return cleanupFile();
});
```

要点:

1. `.then()` 和 `await` 在 event loop 眼里完全一样:都是「递单 + 注册铃铛(回调) + 服务员继续往下跑」。`.then()` 把回调写在明处;`await` 让编译器帮我把后面的代码自动包进回调。
2. `await` **看起来**像堵住服务员,实际暂停的只是这个 async 函数自己;服务员(主线程)照常绕圈服务别人。**await 暂停的是函数,不是服务员。**
3. 打包范围是「到当前函数末尾」——函数外的代码不会被包进去,函数会提前 return 一个 Promise,外面的人照常往下跑。
4. 链式 await 就是纸条套纸条:第二个 `await cleanupFile()` 会把它后面的代码再挂到 cleanup 的铃铛上。**写法是直线的,执行是链式的** —— 这就是 await 治好 callback hell 的原因。
5. 真实项目偏爱 await:多层异步不塌陷、`try/catch` 统一错误处理、跨语言通用(C#/Python/Kotlin/Swift 都有 async/await,写法几乎一样)。

---

## 订正区(对完答案后把说错的地方写在这)

-
