// 习题 3 的操作台:收一个数字,算 fib,报结果。跑完不退出,等下一个任务。
import { parentPort } from "node:worker_threads";

function fib(n: number): number {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

parentPort!.on("message", (n: number) => {
  parentPort!.postMessage(fib(n));
});
