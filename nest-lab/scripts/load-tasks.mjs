// Day 34:负载脚本 —— 启动 PG 版 nest-lab,用几个并发「客户」按比例打各种接口,统计每类请求的耗时。
//
//   npm run load                      # 默认:8 个并发,跑 10 秒
//   npm run load -- --seconds 5 --concurrency 4
//
// 前提:npm run db:seed:big 灌好了 schema app(30 万任务);dist/ 是最新的(npm run build)。
// 应用以 TASKS_STORAGE=postgres、DATABASE_SCHEMA=app、DB_RESET_ON_START=false 启动 —— 不会清空数据,也不碰 e2e:pg 的 app_test。
// 会真的写数据(POST 新建、PATCH 切换 done);想回到干净状态就再跑一次 db:seed:big。
//
// 也可以被别的脚本 import:const { runLoad } = await import('./load-tasks.mjs')
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MAIN = fileURLToPath(new URL('../dist/main.js', import.meta.url));
const DEMO_KEY = 'let-me-in'; // 开发默认的演示钥匙(Day 12),写接口要带

// 启动应用,等它打印出端口
function startApp(databaseUrl) {
  return new Promise((resolve, reject) => {
    const env = {
      PATH: process.env.PATH,
      NO_COLOR: '1',
      NODE_ENV: 'development',
      PORT: '0',
      LOG_REQUESTS: 'false',
      TASKS_STORAGE: 'postgres',
      DATABASE_URL: databaseUrl,
      DATABASE_SCHEMA: 'app',
      DB_POOL_MAX: '10',
      DB_RESET_ON_START: 'false',
    };
    const child = spawn(process.execPath, [MAIN], { cwd: ROOT, env });
    let text = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`应用 15 秒内没有启动:\n${text}`));
    }, 15_000);
    const onData = (chunk) => {
      text += chunk;
      const m = text.match(/http:\/\/localhost:(\d+)/);
      if (m) {
        clearTimeout(timer);
        resolve({ child, base: `http://127.0.0.1:${m[1]}` });
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`应用退出了(code ${code}):\n${text}`));
    });
  });
}

// 构造一个「翻到很后面」的 cursor。⚠️ 正常客户端不该这么做(cursor 是不透明的,Day 19);
// 负载脚本为了不真的翻几千页,按 src/tasks/cursor.ts 的格式直接拼一个。
const makeCursor = (s, f, k, id) => Buffer.from(JSON.stringify({ v: 1, s, f, k, id })).toString('base64url');

const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

export async function runLoad({ seconds = 10, concurrency = 8, databaseUrl, log = console.log } = {}) {
  const url = databaseUrl ?? process.env.DATABASE_URL ?? 'postgresql://nest_lab:nest_lab_dev@localhost:5432/nest_lab';
  const { child, base } = await startApp(url);
  try {
    const get = (path) => fetch(base + path);
    // 准备:最大 id(随机取任务用),以及一个很老的任务做深分页书签(按 -createdAt 排,越老越靠后)
    const first = await (await get('/tasks?sort=-id&limit=1')).json();
    const maxId = first.items[0].id;
    const old = await (await get('/tasks/3000')).json();
    const deepNewest = makeCursor('-createdAt,id', {}, [old.createdAt, old.id], old.id);
    const deepOpen = makeCursor('-createdAt,id', { done: false }, [old.createdAt, old.id], old.id);
    const randomId = () => 1 + Math.floor(Math.random() * maxId);

    // [名字, 权重, 发请求的函数]
    const scenarios = [
      ['列表第一页(默认按 id)', 3, () => get('/tasks')],
      ['列表第一页 sort=-createdAt', 3, () => get('/tasks?sort=-createdAt')],
      ['深分页 sort=-createdAt', 1, () => get(`/tasks?sort=-createdAt&cursor=${deepNewest}`)],
      ['done=false sort=-createdAt', 2, () => get('/tasks?done=false&sort=-createdAt')],
      ['done=false 深分页', 1, () => get(`/tasks?done=false&sort=-createdAt&cursor=${deepOpen}`)],
      ['sort=title 第一页', 1, () => get('/tasks?sort=title')],
      ['q=urgent(少见)', 1, () => get('/tasks?q=urgent')],
      ['q=invoice(常见)', 1, () => get('/tasks?q=invoice')],
      ['q=发票导出(中文 4 字)', 1, () => get(`/tasks?q=${encodeURIComponent('发票导出')}`)],
      ['q=加急(中文 2 字)', 1, () => get(`/tasks?q=${encodeURIComponent('加急')}`)],
      ['q=12345(只有十几条)', 1, () => get('/tasks?q=12345')],
      ['q=没有结果的词', 1, () => get(`/tasks?q=${encodeURIComponent('不存在的任务')}`)],
      ['GET /tasks/:id', 3, () => get(`/tasks/${randomId()}`)],
      ['PATCH /tasks/:id done', 1, () =>
        fetch(`${base}/tasks/${randomId()}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json', 'x-demo-key': DEMO_KEY },
          body: JSON.stringify({ done: Math.random() < 0.5 }),
        })],
      ['POST /tasks', 1, () =>
        fetch(`${base}/tasks`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-demo-key': DEMO_KEY },
          body: JSON.stringify({ title: `负载测试 ${Date.now()}`, checklist: [{ text: '步骤 1', done: false }] }),
        })],
    ];
    const bag = scenarios.flatMap((s, i) => Array(s[1]).fill(i));
    const stats = scenarios.map(() => ({ times: [], errors: 0 }));

    const until = Date.now() + seconds * 1000;
    const worker = async () => {
      while (Date.now() < until) {
        const i = bag[Math.floor(Math.random() * bag.length)];
        const t0 = performance.now();
        try {
          const res = await scenarios[i][2]();
          await res.arrayBuffer();
          if (res.status >= 400 && res.status !== 404) stats[i].errors++;
        } catch {
          stats[i].errors++;
        }
        stats[i].times.push(performance.now() - t0);
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));

    const total = stats.reduce((n, s) => n + s.times.length, 0);
    log(`  ${concurrency} 个并发跑了 ${seconds} 秒,共 ${total} 个请求(${(total / seconds).toFixed(0)} 个/秒)`);
    log(`  ${'请求'.padEnd(26)}${'次数'.padStart(6)}${'p50 ms'.padStart(10)}${'p95 ms'.padStart(10)}${'最大 ms'.padStart(10)}  错误`);
    scenarios.forEach(([name], i) => {
      const t = stats[i].times;
      if (!t.length) return;
      log(`  ${name.padEnd(26)}${String(t.length).padStart(6)}${pct(t, 50).toFixed(1).padStart(10)}${pct(t, 95).toFixed(1).padStart(10)}${Math.max(...t).toFixed(1).padStart(10)}  ${stats[i].errors}`);
    });
    return scenarios.map(([name], i) => ({ name, count: stats[i].times.length, p50: pct(stats[i].times, 50), p95: pct(stats[i].times, 95), errors: stats[i].errors }));
  } finally {
    child.kill('SIGTERM');
  }
}

// 直接运行时(npm run load)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.loadEnvFile(`${ROOT}.env`);
  } catch {
    // 没有 .env 就用默认值
  }
  const arg = (name, dflt) => (process.argv.includes(name) ? Number(process.argv[process.argv.indexOf(name) + 1]) : dflt);
  await runLoad({ seconds: arg('--seconds', 10), concurrency: arg('--concurrency', 8) });
}
