// 习题 1 的操作台:算完 fib 就把结果递回去
import { parentPort, workerData } from "node:worker_threads";

function fib(n: number): number {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

parentPort!.postMessage(fib(workerData.n as number));
