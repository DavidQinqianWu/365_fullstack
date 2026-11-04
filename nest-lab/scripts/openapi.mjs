// Day 20:从代码生成 openapi.json(提交进 git),或检查提交的文件是否过期。
//
//   npm run openapi:generate   # 改了接口以后跑一次,把新的 openapi.json 一起提交
//   npm run openapi:check      # CI 里跑:代码改了却没重新生成 → 退出码 1
//
// 「菜单册是从后厨真实配方自动印出来的」:这份文件不手写,只由代码生成。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

console.log = () => {}; // 关掉服务端日志
const { createApp } = await import('../dist/app.factory.js');
const { buildOpenApiDocument } = await import('../dist/openapi.js');

const FILE = fileURLToPath(new URL('../openapi.json', import.meta.url));
const app = await createApp(undefined, { logger: false });
const generated = JSON.stringify(buildOpenApiDocument(app), null, 2) + '\n';
await app.close();

if (process.argv.includes('--check')) {
  let committed = '';
  try {
    committed = readFileSync(FILE, 'utf8');
  } catch {
    // 文件不存在也算过期
  }
  if (committed === generated) {
    process.stdout.write('✅ openapi.json 与代码一致\n');
  } else {
    const a = committed.split('\n');
    const b = generated.split('\n');
    const i = b.findIndex((line, idx) => line !== a[idx]);
    process.stdout.write(`❌ openapi.json 已过期:第 ${i + 1} 行开始不同\n   提交的:${a[i] ?? '(文件结束)'}\n   代码的:${b[i]}\n   请运行 npm run openapi:generate 并提交\n`);
    process.exit(1);
  }
} else {
  writeFileSync(FILE, generated);
  process.stdout.write(`已生成 openapi.json(${generated.length} 字节)\n`);
}
