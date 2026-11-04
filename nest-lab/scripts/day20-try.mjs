// Day 20 观察脚本:从运行中的应用拉取「标准菜单册」(OpenAPI),检查它,再用它生成前端类型。
//
// 跑:npm run day20   (= nest build + node scripts/day20-try.mjs)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

console.log = () => {};
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);

const { createApp } = await import('../dist/app.factory.js');
const app = await createApp(undefined, { logger: false });
await app.listen(0, '127.0.0.1');
const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;

// ---------- 第 1 幕:拉取菜单册 ----------
line('第 1 幕:GET /docs-json 与 GET /docs');
const doc = await (await fetch(`${base}/docs-json`)).json();
const ui = await fetch(`${base}/docs`);
out(`/docs-json → openapi ${doc.openapi},标题「${doc.info.title}」,版本 ${doc.info.version}`);
out(`/docs      → ${ui.status} ${ui.headers.get('content-type')}(Swagger UI 页面)`);

// ---------- 第 2 幕:接口清单 ----------
line('第 2 幕:接口清单(方法 路径 [弃用] 声明的状态码)');
const ops = Object.entries(doc.paths).flatMap(([path, item]) =>
  Object.entries(item).map(([method, op]) => ({ path, method, op })),
);
for (const { path, method, op } of ops) {
  out(
    `${method.toUpperCase().padEnd(6)} ${path.padEnd(16)} ${op.deprecated ? '[deprecated] ' : ''}${Object.keys(op.responses).join(' ')}${op.security ? '  🔑' : ''}  ${op.summary ?? ''}`,
  );
}

// ---------- 第 3 幕:抽查 schema ----------
line('第 3 幕:抽查几个 schema');
const S = doc.components.schemas;
out(`CreateTaskDto   必填:${JSON.stringify(S.CreateTaskDto.required)}  全部字段:${Object.keys(S.CreateTaskDto.properties).join(', ')}`);
out(`UpdateTaskDto   必填:${JSON.stringify(S.UpdateTaskDto.required ?? [])}  全部字段:${Object.keys(S.UpdateTaskDto.properties).join(', ')}`);
out(`TaskPage        ${JSON.stringify(S.TaskPage)}`);
out(`ProblemDetailsDto 字段:${Object.keys(S.ProblemDetailsDto.properties).join(', ')}`);
out(`ValidationProblemDto:${JSON.stringify(S.ValidationProblemDto.allOf ?? S.ValidationProblemDto).slice(0, 160)}…`);
const listParams = doc.paths['/v2/tasks'].get.parameters.map((p) => `${p.name}(${p.in}${p.required ? ',必填' : ''})`);
out(`GET /v2/tasks 的参数:${listParams.join(', ')}`);

// ---------- 第 4 幕:自动检查 ----------
line('第 4 幕:自动检查');
const checks = [];
const check = (label, ok, extra = '') => {
  checks.push(ok);
  out(`${ok ? '✅' : '❌'} ${label}${extra ? ' —— ' + extra : ''}`);
};
const writes = ops.filter(({ method }) => ['post', 'put', 'patch'].includes(method));
const missing422 = writes.filter(({ op }) => !op.responses['422']?.content?.['application/problem+json']);
check(`每个写接口(${writes.length} 个)都声明了 422 + application/problem+json`, missing422.length === 0, missing422.map((w) => w.path).join(', '));
const errorsNotProblem = ops.flatMap(({ path, method, op }) =>
  Object.entries(op.responses)
    .filter(([code, r]) => Number(code) >= 400 && !r.content?.['application/problem+json'])
    .map(([code]) => `${method} ${path} ${code}`),
);
check('所有声明的 4xx 都是 application/problem+json', errorsNotProblem.length === 0, errorsNotProblem.join(', '));
const v1 = ops.filter(({ path }) => path.startsWith('/v1/'));
check(`v1 的 ${v1.length} 个操作都标了 deprecated`, v1.every(({ op }) => op.deprecated === true));
check('v2 / users 的操作都没有标 deprecated', ops.filter(({ path }) => !path.startsWith('/v1/')).every(({ op }) => !op.deprecated));
// 注意只查 schema:整份文档里 users 的说明文字「响应里永远没有 password / passwordHash」本身就含这个词(第一次跑时这条误报过)
check('所有 schema 里都没有 passwordHash 字段', !JSON.stringify(doc.components.schemas).includes('passwordHash'));
check('写接口都声明了 demo-key 安全要求', writes.every(({ op }) => op.security?.some((s) => 'demo-key' in s)));
check('没有把 @All 兜底路由写进文档', !ops.some(({ method }) => ['options', 'head'].includes(method)));
const ids = ops.map(({ op }) => op.operationId);
check('operationId 全部唯一', new Set(ids).size === ids.length, ids.join(' '));
out(`结论:${checks.every(Boolean) ? '✅ 全部通过' : '❌ 有不通过的检查'}`);

// ---------- 第 5 幕:用菜单册生成前端类型(openapi-typescript) ----------
line('第 5 幕:openapi-typescript 生成的前端类型(节选)');
const { default: openapiTS, astToString } = await import('openapi-typescript');
const ts = astToString(await openapiTS(doc));
const dir = mkdtempSync(join(tmpdir(), 'day20-'));
writeFileSync(join(dir, 'api.d.ts'), ts);
out(`生成了 ${ts.split('\n').length} 行类型定义;下面是 TaskPage、ProblemDetailsDto 两段:`);
const pick = (name) => {
  const start = ts.indexOf(`        ${name}: {`);
  const end = ts.indexOf('\n        };', start);
  return ts.slice(start, end + 11);
};
out(pick('TaskPage'));
out(pick('ProblemDetailsDto'));
rmSync(dir, { recursive: true, force: true });
await app.close();

// ---------- 第 6 幕:生产环境默认不开放文档 ----------
line('第 6 幕:NODE_ENV=production 启动(不设 SWAGGER_ENABLED)');
const MAIN = fileURLToPath(new URL('../dist/main.js', import.meta.url));
const cwd = mkdtempSync(join(tmpdir(), 'day20-prod-'));
await new Promise((resolve) => {
  const child = spawn(process.execPath, [MAIN], {
    cwd,
    env: { PATH: process.env.PATH, NODE_ENV: 'production', DEMO_KEY: 'prod-secret-key', PORT: '0', LOG_REQUESTS: 'false' },
  });
  let buf = '';
  child.stdout.on('data', async (chunk) => {
    buf += chunk;
    const m = buf.match(/已开门:http:\/\/localhost:(\d+)/);
    if (m && !child.done) {
      child.done = true;
      for (const path of ['/docs-json', '/docs', '/v2/tasks?limit=1']) {
        const res = await fetch(`http://127.0.0.1:${m[1]}${path}`);
        out(`GET ${path.padEnd(18)} → ${res.status}`);
      }
      child.kill('SIGTERM');
    }
  });
  child.on('exit', resolve);
});
rmSync(cwd, { recursive: true, force: true });
out('\n观察结束');
