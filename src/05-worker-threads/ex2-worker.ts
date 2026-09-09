// 习题 2 的操作台:收到数据后报个到,并在共享内存上做加法
import { parentPort } from "node:worker_threads";

parentPort!.on("message", (msg: { kind: string; buf?: ArrayBuffer; shared?: SharedArrayBuffer; unsafe?: boolean }) => {
  if (msg.kind === "received") {
    // 只是确认收到,主线程用这个时间点算耗时
    parentPort!.postMessage({ kind: "ack", size: msg.buf?.byteLength ?? 0 });
    return;
  }

  if (msg.kind === "count") {
    const view = new Int32Array(msg.shared!);
    for (let i = 0; i < 100_000; i++) {
      if (msg.unsafe) {
        const cur = view[0]!;   // 第 1 步:读
        view[0] = cur + 1;      // 第 2、3 步:加 + 写回。中间可能被另一个线程插进来
      } else {
        Atomics.add(view, 0, 1); // 读+加+写回,一步完成,不会被打断
      }
    }
    parentPort!.postMessage({ kind: "counted" });
  }
});
