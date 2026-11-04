// Day 12 观察脚本:开店检查单(env 校验)—— 配置错了立即拒绝启动,配置对了类型也对。
//
// 跑:npm run day12   (= nest build + node scripts/day12-try.mjs)
// 做法:用 Day 4 的 child_process 把 dist/main.js 当成子进程,用不同的环境变量各启动一次。
//   - env 只传 PATH + 本次要测的变量,不继承你终端里的变量
//   - cwd 设成一个空的临时目录,这样不会读到 nest-lab/.env(如果你建了的话)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { validateEnv } from '../dist/config/env.schema.js';

const MAIN = fileURLToPath(new URL('../dist/main.js', import.meta.url));
const emptyDir = mkdtempSync(join(tmpdir(), 'day12-'));
const line = (title) => console.log(`\n========== ${title} ==========`);
const clean = (text) =>
  text
    .replace(/\x1b\[[0-9;]*m/g, '') // 去掉终端颜色
    .split('\n')
    .filter((l) => l.trim() && !l.trimStart().startsWith('at ')) // 去掉调用栈
    .map((l) => l.replace(/^\[Nest\] \d+\s+- [^ ]+, [^ ]+ [AP]M\s+/, '[Nest] ')) // 去掉 PID 和时间
    .join('\n');

// 启动一次 main.js;onReady 收到端口后可以发请求,返回进程退出码
function boot(env, onReady) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [MAIN], { cwd: emptyDir, env: { PATH: process.env.PATH, ...env } });
    let output = '';
    const collect = (chunk) => {
      output += chunk;
      const m = output.match(/已开门:http:\/\/localhost:(\d+)/);
      if (m && onReady && !child.readyHandled) {
        child.readyHandled = true;
        onReady(Number(m[1])).finally(() => child.kill('SIGTERM'));
      }
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('exit', (code, signal) => {
      console.log(clean(output));
      console.log(`   → 进程结束:exit code = ${code}${signal ? `,signal = ${signal}` : ''}`);
      resolve(code);
    });
  });
}

// ---------- 第 1 幕:schema 在进程内的效果(字符串进,类型出) ----------
line('第 1 幕:validateEnv 把字符串变成正确的类型');
const parsed = validateEnv({ PORT: '8080', LOG_REQUESTS: 'false', PATH: '/usr/bin' });
console.log('输入全是字符串 → 输出:', parsed);
console.log('typeof PORT =', typeof parsed.PORT, '| typeof LOG_REQUESTS =', typeof parsed.LOG_REQUESTS);
console.log("对比:z.coerce.boolean().parse('false') =", z.coerce.boolean().parse('false'), "  ← 坑!");
console.log("      z.stringbool().parse('false')     =", z.stringbool().parse('false'));

// ---------- 第 2 幕:配置错误 → 拒绝启动 ----------
line('第 2 幕-A:NODE_ENV=production 但没设 DEMO_KEY');
await boot({ NODE_ENV: 'production' });

line('第 2 幕-B:PORT=abc');
await boot({ PORT: 'abc' });

line('第 2 幕-C:一次写错好几个(NODE_ENV=prod, DEMO_KEY=short, LOG_REQUESTS=maybe)');
await boot({ NODE_ENV: 'prod', DEMO_KEY: 'short', LOG_REQUESTS: 'maybe' });

// ---------- 第 3 幕:配置正确 → 正常开门,而且钥匙来自配置 ----------
line('第 3 幕:NODE_ENV=production DEMO_KEY=prod-secret-key PORT=0 LOG_REQUESTS=false');
await boot({ NODE_ENV: 'production', DEMO_KEY: 'prod-secret-key', PORT: '0', LOG_REQUESTS: 'false' }, async (port) => {
  const post = (key) =>
    fetch(`http://127.0.0.1:${port}/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-demo-key': key },
      body: JSON.stringify({ title: '学配置' }),
    });
  console.log('   用旧钥匙 let-me-in        → POST /tasks', (await post('let-me-in')).status);
  console.log('   用配置里的 prod-secret-key → POST /tasks', (await post('prod-secret-key')).status);
});

rmSync(emptyDir, { recursive: true, force: true });
console.log('\n观察结束');
