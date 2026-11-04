// Day 37 观察脚本:隔离级别与并发异常 —— 两个连接(T1 / T2)按固定时间顺序交替执行,
// 在 READ UNCOMMITTED / READ COMMITTED / REPEATABLE READ / SERIALIZABLE 下复现脏读、不可重复读、幻读、丢失更新、写偏斜,
// 自动判定「异常发生了 / 没发生 / 被数据库拦下(要重试)」,最后用 src/37-isolation-levels/with-retry.ts 演示重试。
//
// 跑:npm run day37   # 本机约 3 秒
// 前提同 Day 22:PostgreSQL 已运行、本机有 psql;连接参数来自 .env 的 POSTGRES_*(没写时用开发默认值)。
// 表都在独立的 schema day37 里,每次运行都会先删掉重建;不碰 app 和 app_test。
// 手动版(两个 psql 窗口)见 sql/day37/04-two-windows.sql。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { withRetry } from '../../src/37-isolation-levels/with-retry.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
try {
  process.loadEnvFile(`${ROOT}.env`);
} catch {
  // 没有 .env 就用默认值
}
const env = {
  ...process.env,
  PGHOST: process.env.POSTGRES_HOST ?? 'localhost',
  PGPORT: process.env.POSTGRES_PORT ?? '5432',
  PGUSER: process.env.POSTGRES_USER ?? 'nest_lab',
  PGPASSWORD: process.env.POSTGRES_PASSWORD ?? 'nest_lab_dev',
  PGDATABASE: process.env.POSTGRES_DB ?? 'nest_lab',
  PGCONNECT_TIMEOUT: '3',
  PGAPPNAME: 'day37',
};
const URL_ = `postgresql://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`;
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
const line = (t) => out(`\n========== ${t} ==========`);
const fail = (title, hint) => {
  out(`\n❌ ${title}\n${hint}`);
  process.exit(1);
};
const PSQL = 'psql -w -X "$@" 2>&1';
const run = (args) => spawnSync('sh', ['-c', PSQL, 'sh', ...args], { cwd: ROOT, env, encoding: 'utf8', timeout: 60_000 });
const runFile = (f) => {
  const r = run(['-f', `sql/day37/${f}`]);
  // 03-levels.sql 里故意演示了一个错误(查询之后再 SET TRANSACTION),它不算失败
  if (r.status !== 0 || /ERROR/.test(r.stdout.replace(/^.*must be called before any query.*$/m, ''))) fail(`${f} 执行失败`, r.stdout);
  return r.stdout;
};
const t0 = Date.now();

// ---------- 第 0 幕:数据库在不在 ----------
line('第 0 幕:检查数据库');
const probe = spawnSync('psql', ['-w', '-X', '-At', '-c', 'SELECT version()'], { env, encoding: 'utf8', timeout: 10_000 });
if (probe.error) fail('找不到 psql 命令', '  安装方法见 Day 22 讲义「先跑起来」;或者用 docker compose exec postgres psql …');
if (probe.status !== 0) {
  fail(
    `连不上 ${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`,
    `  psql 说:${probe.stderr.trim()}\n  · Docker:docker compose up -d,等 docker compose ps 显示 healthy\n  · 本机安装:确认服务已启动、.env 里的 POSTGRES_* 与建库时一致(见 Day 22 讲义)`,
  );
}
out(`服务器:${probe.stdout.trim().split(' on ')[0]}`);
const { default: pg } = await import('pg');
const connect = async () => {
  const c = new pg.Client({ connectionString: URL_, options: '-c search_path=day37' });
  c.on('error', () => {});
  await c.connect();
  return c;
};

line('第 1 幕:准备数据与隔离级别的设置方式(01-setup.sql、03-levels.sql)');
runFile('01-setup.sql');
out(runFile('03-levels.sql').trimEnd());

// ---------- 场景引擎 ----------
// 每一步:{ who: 'T1' | 'T2', sql: string | (vals) => string, as?: 名字(把结果的第一列存下来), bg?: true(不等它返回,后面用 { wait: 名字 } 等) }
const LEVELS = ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'];
const SHORT = { 'READ UNCOMMITTED': 'RU', 'READ COMMITTED': 'RC', 'REPEATABLE READ': 'RR', SERIALIZABLE: 'SER' };
const results = {}; // results[场景][级别] = 判定

async function scenario(title, steps, finalSql, judge, { levels = LEVELS, showTimelineFor = LEVELS, short = title } = {}) {
  line(title);
  results[short] = {};
  for (const level of levels) {
    runFile('02-reset.sql');
    const conns = { T1: await connect(), T2: await connect() };
    const vals = {};
    const errors = [];
    const pending = {};
    const timeline = [];
    const exec = async (step) => {
      const sql = (typeof step.sql === 'function' ? step.sql(vals) : step.sql).replaceAll('<L>', level);
      try {
        const r = await conns[step.who].query(sql);
        const shown = r.rows?.length ? Object.values(r.rows[0])[0] : r.command;
        if (step.as) vals[step.as] = shown;
        timeline.push(`    ${step.who} │ ${sql.padEnd(64)} → ${shown}`);
      } catch (e) {
        errors.push({ who: step.who, code: e.code, message: e.message });
        timeline.push(`    ${step.who} │ ${sql.padEnd(64)} → ERROR ${e.code} ${e.message}`);
        if (e.detail) timeline.push(`         DETAIL: ${e.detail}`);
        if (e.hint) timeline.push(`         HINT:   ${e.hint}`);
      }
    };
    for (const step of steps) {
      if (step.wait) {
        await pending[step.wait];
        continue;
      }
      if (step.bg) {
        pending[step.as] = exec(step);
        await new Promise((r) => setTimeout(r, 150)); // 让它先发到服务器、卡在那里
        timeline.push(`    ${step.who} │ (上一条在等 ${step.who === 'T1' ? 'T2' : 'T1'} 结束)`);
        continue;
      }
      await exec(step);
    }
    for (const c of Object.values(conns)) {
      await c.query('ROLLBACK').catch(() => {}); // 万一有没结束的事务
      await c.end();
    }
    const checker = await connect();
    const final = Object.values((await checker.query(finalSql)).rows[0])[0];
    await checker.end();
    const verdict = judge(vals, final, errors);
    results[short][level] = verdict;
    if (showTimelineFor.includes(level)) {
      out(`  ── ${level} ──`);
      out(timeline.join('\n'));
      out(`    最终:${final}   判定:${verdict}`);
    } else {
      out(`  ── ${level} ── 判定:${verdict}(最终 ${final})`);
    }
  }
}
const raised = (errors) => errors.find((e) => e.code === '40001');
const blocked = (errors) => (raised(errors) ? `🛑 被拦下:${raised(errors).code} ${raised(errors).message}` : null);

// ① 脏读
await scenario(
  '第 2 幕:脏读(读到别人没提交的数据)',
  [
    { who: 'T1', sql: 'BEGIN' },
    { who: 'T1', sql: 'UPDATE accounts SET balance = 999 WHERE id = 1' },
    { who: 'T2', sql: 'BEGIN ISOLATION LEVEL <L>' },
    { who: 'T2', sql: 'SELECT balance FROM accounts WHERE id = 1', as: 'seen' },
    { who: 'T1', sql: 'ROLLBACK' },
    { who: 'T2', sql: 'COMMIT' },
  ],
  'SELECT balance FROM accounts WHERE id = 1',
  (v) => (v.seen === 999 ? '⚠️ 发生了:读到了没提交的 999' : `✅ 没发生:T2 读到 ${v.seen}`),
  { short: '脏读', showTimelineFor: ['READ UNCOMMITTED'] },
);

// ② 不可重复读
await scenario(
  '第 3 幕:不可重复读(同一事务里两次读同一行)',
  [
    { who: 'T2', sql: 'BEGIN ISOLATION LEVEL <L>' },
    { who: 'T2', sql: 'SELECT balance FROM accounts WHERE id = 1', as: 'r1' },
    { who: 'T1', sql: 'UPDATE accounts SET balance = 200 WHERE id = 1' },
    { who: 'T2', sql: 'SELECT balance FROM accounts WHERE id = 1', as: 'r2' },
    { who: 'T2', sql: 'COMMIT' },
  ],
  'SELECT balance FROM accounts WHERE id = 1',
  (v) => (v.r1 !== v.r2 ? `⚠️ 发生了:第一次 ${v.r1},第二次 ${v.r2}` : `✅ 没发生:两次都是 ${v.r1}`),
  { short: '不可重复读', showTimelineFor: ['READ COMMITTED', 'REPEATABLE READ'] },
);

// ③ 幻读
await scenario(
  '第 4 幕:幻读(同一事务里两次按条件数行)',
  [
    { who: 'T2', sql: 'BEGIN ISOLATION LEVEL <L>' },
    { who: 'T2', sql: 'SELECT count(*)::int FROM tasks WHERE owner_id = 1 AND NOT done', as: 'c1' },
    { who: 'T1', sql: "INSERT INTO tasks (owner_id, title) VALUES (1, '新任务')" },
    { who: 'T2', sql: 'SELECT count(*)::int FROM tasks WHERE owner_id = 1 AND NOT done', as: 'c2' },
    { who: 'T2', sql: 'COMMIT' },
  ],
  'SELECT count(*)::int FROM tasks WHERE owner_id = 1 AND NOT done',
  (v) => (v.c1 !== v.c2 ? `⚠️ 发生了:第一次 ${v.c1} 行,第二次 ${v.c2} 行` : `✅ 没发生:两次都是 ${v.c1} 行`),
  { short: '幻读', showTimelineFor: ['READ COMMITTED', 'REPEATABLE READ'] },
);

// ④ 丢失更新:读 → 在应用里算 → 写回
await scenario(
  '第 5 幕:丢失更新(两人都「读 → 在应用里 +1 → 写回」)',
  [
    { who: 'T1', sql: 'BEGIN ISOLATION LEVEL <L>' },
    { who: 'T1', sql: 'SELECT n FROM counters WHERE id = 1', as: 'a' },
    { who: 'T2', sql: 'BEGIN ISOLATION LEVEL <L>' },
    { who: 'T2', sql: 'SELECT n FROM counters WHERE id = 1', as: 'b' },
    { who: 'T1', sql: (v) => `UPDATE counters SET n = ${v.a + 1} WHERE id = 1` },
    { who: 'T1', sql: 'COMMIT' },
    { who: 'T2', sql: (v) => `UPDATE counters SET n = ${v.b + 1} WHERE id = 1` },
    { who: 'T2', sql: 'COMMIT' },
  ],
  'SELECT n FROM counters WHERE id = 1',
  (_v, final, errors) => blocked(errors) ?? (final === 1 ? '⚠️ 发生了:两次 +1,结果只是 1' : `✅ 没发生:结果 ${final}`),
  { short: '丢失更新(读-算-写)', showTimelineFor: ['READ COMMITTED', 'REPEATABLE READ'] },
);

// ④b 对照:原子自增 n = n + 1(读和写在同一条语句里)
await scenario(
  '第 5½ 幕:对照 —— 原子自增:两人都写 UPDATE … SET n = n + 1(读和写在同一条语句里;T2 的这一句要等 T1 结束)',
  [
    { who: 'T1', sql: 'BEGIN ISOLATION LEVEL <L>' },
    { who: 'T1', sql: 'UPDATE counters SET n = n + 1 WHERE id = 1' },
    { who: 'T2', sql: 'BEGIN ISOLATION LEVEL <L>' },
    { who: 'T2', sql: 'SELECT 1', as: 'snap' }, // 让 T2 先拿到快照(RR / SER 下快照在第一条语句时拍)
    { who: 'T2', sql: 'UPDATE counters SET n = n + 1 WHERE id = 1', as: 'u2', bg: true },
    { who: 'T1', sql: 'COMMIT' },
    { wait: 'u2' },
    { who: 'T2', sql: 'COMMIT' },
  ],
  'SELECT n FROM counters WHERE id = 1',
  (_v, final, errors) => blocked(errors) ?? (final === 2 ? '✅ 没丢:结果 2' : `⚠️ 结果 ${final}`),
  { short: '原子自增 n = n + 1', showTimelineFor: ['READ COMMITTED', 'REPEATABLE READ'] },
);

// ⑤ 写偏斜:值班医生
await scenario(
  '第 6 幕:写偏斜(两个值班医生都看到「还有别人在」,于是都请假)',
  [
    { who: 'T1', sql: 'BEGIN ISOLATION LEVEL <L>' },
    { who: 'T1', sql: 'SELECT count(*)::int FROM doctors WHERE on_call', as: 'c1' },
    { who: 'T2', sql: 'BEGIN ISOLATION LEVEL <L>' },
    { who: 'T2', sql: 'SELECT count(*)::int FROM doctors WHERE on_call', as: 'c2' },
    { who: 'T1', sql: "UPDATE doctors SET on_call = false WHERE name = 'Alice'" },
    { who: 'T2', sql: "UPDATE doctors SET on_call = false WHERE name = 'Bob'" },
    { who: 'T1', sql: 'COMMIT' },
    { who: 'T2', sql: 'COMMIT' },
  ],
  'SELECT count(*)::int FROM doctors WHERE on_call',
  (_v, final, errors) => blocked(errors) ?? (final === 0 ? '⚠️ 发生了:没人值班了' : `✅ 没发生:还有 ${final} 人值班`),
  { short: '写偏斜(值班医生)', showTimelineFor: ['REPEATABLE READ', 'SERIALIZABLE'] },
);

// ⑤b 写偏斜:nest-lab 风格,「每个用户最多 3 个未完成任务」
await scenario(
  '第 7 幕:写偏斜(nest-lab 风格:每个用户最多 3 个未完成任务,两个请求同时检查、同时新建)',
  [
    { who: 'T1', sql: 'BEGIN ISOLATION LEVEL <L>' },
    { who: 'T1', sql: 'SELECT count(*)::int FROM tasks WHERE owner_id = 1 AND NOT done', as: 'c1' },
    { who: 'T2', sql: 'BEGIN ISOLATION LEVEL <L>' },
    { who: 'T2', sql: 'SELECT count(*)::int FROM tasks WHERE owner_id = 1 AND NOT done', as: 'c2' },
    { who: 'T1', sql: "INSERT INTO tasks (owner_id, title) VALUES (1, 'T1 新建的')" },
    { who: 'T2', sql: "INSERT INTO tasks (owner_id, title) VALUES (1, 'T2 新建的')" },
    { who: 'T1', sql: 'COMMIT' },
    { who: 'T2', sql: 'COMMIT' },
  ],
  'SELECT count(*)::int FROM tasks WHERE owner_id = 1 AND NOT done',
  (_v, final, errors) => blocked(errors) ?? (final > 3 ? `⚠️ 发生了:未完成任务变成 ${final} 个(上限 3)` : `✅ 没发生:${final} 个`),
  { short: '写偏斜(每人最多 3 个)', showTimelineFor: ['SERIALIZABLE'] },
);

// ---------- 汇总表 ----------
line('第 8 幕:汇总(⚠️ = 异常发生了,✅ = 没发生,🛑 = 数据库报 40001 拦下、要应用重试)');
const icon = (v) => (v.startsWith('⚠️') ? '⚠️ 发生' : v.startsWith('🛑') ? '🛑 40001' : '✅ 没发生');
out(`  ${'异常'.padEnd(26)}${LEVELS.map((l) => SHORT[l].padEnd(12)).join('')}`);
for (const [name, byLevel] of Object.entries(results)) {
  out(`  ${name.padEnd(26)}${LEVELS.map((l) => icon(byLevel[l]).padEnd(12)).join('')}`);
}

// ---------- 重试 ----------
line('第 9 幕:40001 之后怎么办 —— 整个事务从头重做(src/37-isolation-levels/with-retry.ts)');
// 两个并发的事务;第一次尝试时用一个「栅栏」确保两边都先读完再写,让冲突一定发生
const barrier = () => {
  let arrived = 0;
  let release;
  const all = new Promise((r) => (release = r));
  return () => (++arrived === 2 && release(), all);
};
async function inTx(client, level, work) {
  await client.query(`BEGIN ISOLATION LEVEL ${level}`);
  try {
    const result = await work();
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  }
}
{
  out('\n  ① REPEATABLE READ 下的「读 → 算 → 写回」:冲突的那个事务报 40001,重试时重新读到新值');
  runFile('02-reset.sql');
  const both = barrier();
  const worker = async (name) => {
    const c = await connect();
    try {
      return await withRetry(
        (attempt) =>
          inTx(c, 'REPEATABLE READ', async () => {
            const n = (await c.query('SELECT n FROM counters WHERE id = 1')).rows[0].n;
            out(`    ${name} 第 ${attempt} 次:读到 n = ${n}`);
            if (attempt === 1) await both();
            await c.query('UPDATE counters SET n = $1 WHERE id = 1', [n + 1]);
            return `${name} 在第 ${attempt} 次提交,写入 ${n + 1}`;
          }),
        { onRetry: ({ attempt, delayMs, error }) => out(`    ${name} 第 ${attempt} 次失败:${error.code} ${error.message} → 等 ${delayMs} ms 后整个事务重做`) },
      );
    } finally {
      await c.end();
    }
  };
  const done = await Promise.all([worker('T1'), worker('T2')]);
  done.forEach((d) => out(`    ${d}`));
  const n = Object.values(run(['-At', '-c', 'SELECT n FROM day37.counters WHERE id = 1']).stdout.trim().split('\n')).at(-1);
  out(`    最终 n = ${n}(两次 +1 都没丢)`);
}
{
  out('\n  ② SERIALIZABLE 下的值班请假:被拦下的那个事务重试时重新检查,发现只剩一个人了,于是不批准');
  runFile('02-reset.sql');
  const both = barrier();
  const worker = async (name) => {
    const c = await connect();
    try {
      return await withRetry(
        (attempt) =>
          inTx(c, 'SERIALIZABLE', async () => {
            const onCall = (await c.query('SELECT count(*)::int AS n FROM doctors WHERE on_call')).rows[0].n;
            out(`    ${name} 第 ${attempt} 次:值班的还有 ${onCall} 人`);
            if (attempt === 1) await both();
            if (onCall < 2) return `${name} 第 ${attempt} 次:只剩自己了,不批准请假`;
            await c.query('UPDATE doctors SET on_call = false WHERE name = $1', [name === 'T1' ? 'Alice' : 'Bob']);
            return `${name} 第 ${attempt} 次:请假成功`;
          }),
        { onRetry: ({ attempt, delayMs, error }) => out(`    ${name} 第 ${attempt} 次失败:${error.code} ${error.message} → 等 ${delayMs} ms 后整个事务重做`) },
      );
    } finally {
      await c.end();
    }
  };
  const done = await Promise.all([worker('T1'), worker('T2')]);
  done.forEach((d) => out(`    ${d}`));
  out(`    最终值班表:${run(['-At', '-c', "SELECT string_agg(name || '=' || on_call, ', ' ORDER BY name) FROM day37.doctors"]).stdout.trim()}`);
}

out(`\n观察结束(用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒):表留在 schema day37 里,可以开两个 psql 窗口按 sql/day37/04-two-windows.sql 手动做一遍`);
