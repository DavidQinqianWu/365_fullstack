/**
 * 实验 05 — 阻塞 Event Loop vs 协作式分片
 *
 * 单线程 event loop 意味着:同步 JavaScript 运行期间,
 * 其他什么都执行不了 —— 没有 timer、没有 I/O callback、没有请求处理。
 *
 * 本脚本用心跳 timer 演示这种差异:
 *   - CASE 1(阻塞):一个大的同步循环(约 1s CPU 工作)
 *     -> 心跳冻结,之后延迟集中爆发。
 *   - CASE 2(分片):同样的工作量用 setImmediate 切成小片
 *     -> 每片结束让出 loop,心跳保持准时。
 *
 * 运行: node src/01-event-loop/05-blocking-vs-chunked.ts   (或: npx tsx src/01-event-loop/05-blocking-vs-chunked.ts)
 */

const HEARTBEAT_MS = 100; // 预期心跳间隔
const TOTAL_WORK = 1_200_000_000; // 忙循环总迭代次数(约 1s CPU)
const CHUNK_WORK = 10_000_000; // CASE 2 中每片的迭代次数

/** 纯 CPU 消耗 —— 模拟 JSON 解析、加密、大循环等场景。 */
function burnCpu(iterations: number): number {
  let acc = 0;
  for (let i = 0; i < iterations; i++) {
    acc += Math.sqrt(i);
  }
  return acc;
}

/** 启动心跳,返回观察到的延迟(实际间隔 - 预期间隔)。 */
function startHeartbeat(): { stop: () => number[] } {
  const delays: number[] = [];
  let last = Date.now();
  const timer = setInterval(() => {
    const now = Date.now();
    delays.push(now - last - HEARTBEAT_MS); // 0 = 完全准时
    last = now;
  }, HEARTBEAT_MS);
  return {
    stop: () => {
      clearInterval(timer);
      return delays;
    },
  };
}

function report(label: string, delays: number[]): void {
  const max = Math.max(...delays, 0);
  const avg = delays.length
    ? (delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(1)
    : "0";
  console.log(
    `${label}\n  心跳次数: ${delays.length},最大延迟: ${max}ms,平均延迟: ${avg}ms\n  延迟明细: [${delays.join(", ")}]`
  );
}

// ---------------- CASE 1:一个大的阻塞循环 ----------------
function caseBlocking(done: () => void): void {
  console.log("CASE 1 —— 阻塞:全部工作在一个同步循环里跑完");
  const heartbeat = startHeartbeat();
  const t0 = Date.now();

  // event loop 现在卡死在这里。循环结束之前心跳无法触发
  // —— 所有排队的 callback 都只能等待。
  burnCpu(TOTAL_WORK);

  console.log(`  工作完成,耗时 ${Date.now() - t0}ms(期间 loop 完全冻结)`);
  // 让 loop 喘息约 300ms,让积压的心跳延迟补发。
  setTimeout(() => {
    report("CASE 1 结果(心跳冻结,之后延迟集中爆发):", heartbeat.stop());
    done();
  }, 300);
}

// ---------------- CASE 2:用 setImmediate 分片 ----------------
function caseChunked(done: () => void): void {
  console.log("CASE 2 —— 分片:同样的工作量,用 setImmediate 切片");
  const heartbeat = startHeartbeat();
  const t0 = Date.now();
  let remaining = TOTAL_WORK;
  let sink = 0;

  function slice(): void {
    // 做一小片工作,然后【让出】 event loop。
    // setImmediate 把下一片排进 check phase,
    // 这样 timer 和 I/O callback 有机会在片间执行。
    sink += burnCpu(Math.min(CHUNK_WORK, remaining));
    remaining -= CHUNK_WORK;

    if (remaining > 0) {
      setImmediate(slice);
    } else {
      console.log(`  工作完成,耗时 ${Date.now() - t0}ms(loop 全程保持响应)`);
      setTimeout(() => {
        report("CASE 2 结果(心跳保持基本准时):", heartbeat.stop());
        done();
      }, 300);
    }
  }

  slice();
}

console.log("Event Loop 阻塞实验 —— 观察心跳延迟\n");
caseBlocking(() => caseChunked(() => console.log("完成。")));
