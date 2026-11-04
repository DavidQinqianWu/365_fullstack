// Day 27:用 psql 重建 nest-lab 的数据库结构并写入种子数据
//
//   npm run db:reset                       # schema app(开发用)
//   npm run db:reset -- --schema app_test  # e2e:pg 用的独立 schema(不带种子:测试启动时自己写样品数据)
//   npm run db:seed:big                    # Day 34:schema app + 30 万任务的「真实规模」种子(sql/seed-big.sql)
//
// 连接串来自 DATABASE_URL(.env 或环境变量);没有就用 .env.example 里的开发默认值。
// ⚠️ 会 DROP 整个 schema。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
try {
  process.loadEnvFile(`${ROOT}.env`);
} catch {
  // 没有 .env 就用默认值
}
const args = process.argv.slice(2);
const schema = args.includes('--schema') ? args[args.indexOf('--schema') + 1] : (process.env.DATABASE_SCHEMA ?? 'app');
const withSeed = !args.includes('--no-seed') && !args.includes('--schema');
const big = args.includes('--big');
if (big && schema === 'app_test') {
  process.stderr.write('❌ 不要往 app_test 灌大数据:它是 e2e:pg 专用的 schema,测试启动时会清空它\n');
  process.exit(1);
}
if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema ?? '')) {
  process.stderr.write(`❌ schema 名不合法:${schema}(只允许小写字母、数字、下划线)\n`);
  process.exit(1);
}
const url = process.env.DATABASE_URL ?? 'postgresql://nest_lab:nest_lab_dev@localhost:5432/nest_lab';
const files = ['sql/schema.sql', ...(big ? ['sql/seed-big.sql'] : withSeed ? ['sql/seed.sql'] : [])];
const r = spawnSync('psql', ['-w', '-X', '-q', '-v', `schema=${schema}`, ...files.flatMap((f) => ['-f', f]), url], {
  cwd: ROOT,
  env: { ...process.env, PGCONNECT_TIMEOUT: '3' },
  encoding: 'utf8',
  timeout: 180_000, // 灌 30 万行(--big)在慢机器上要几十秒
});
if (r.error) {
  process.stderr.write('❌ 找不到 psql 命令。安装方法见 Day 22 讲义;或者 docker compose exec postgres psql …\n');
  process.exit(1);
}
if (r.status !== 0) {
  process.stderr.write(
    `❌ 重建失败(${url.replace(/:[^:@/]*@/, ':***@')},schema ${schema})\n${r.stderr.trim()}\n` +
      '  · Docker:docker compose up -d,等 docker compose ps 显示 healthy\n' +
      '  · 本机安装:确认服务已启动、DATABASE_URL 正确(见 Day 22 讲义)\n',
  );
  process.exit(1);
}
process.stdout.write(`✅ schema ${schema} 已重建(${files.join(' + ')})${r.stdout.trim() ? `\n${r.stdout.trim()}` : ''}\n`);
