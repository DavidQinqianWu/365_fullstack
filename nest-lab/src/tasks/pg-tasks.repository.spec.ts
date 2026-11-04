import { Logger } from '@nestjs/common';
import pg from 'pg';
import { ProblemException } from '../common/problems/problem.exception.js';
import { escapeLike, keysetCondition, PgTasksRepository } from './pg-tasks.repository.js';
import { type SortKey, withTieBreaker } from './task-query.js';

// Day 34:keyset 分页生成的 SQL 片段(不连数据库,只看拼出来的字符串和参数)
function build(sort: SortKey[], values: unknown[]) {
  const params: unknown[] = [];
  const sql = keysetCondition(sort, values, (v) => `$${params.push(v)}`);
  return { sql, params };
}

describe('keysetCondition', () => {
  it('方向相同:一个行值比较', () => {
    const { sql, params } = build(
      [
        { field: 'createdAt', dir: 'desc' },
        { field: 'id', dir: 'desc' },
      ],
      ['2025-01-01T00:00:00.000Z', 42],
    );
    expect(sql).toBe('(t.created_at, t.id) < ($1::timestamptz, $2::bigint)');
    expect(params).toEqual(['2025-01-01T00:00:00.000Z', 42]);
  });

  it('方向混合(-createdAt, id):OR 展开,前面多一个第一列的冗余范围条件(Day 31 发现、Day 34 修复)', () => {
    const { sql, params } = build(withTieBreaker([{ field: 'createdAt', dir: 'desc' }]), ['2025-01-01T00:00:00.000Z', 42]);
    expect(sql).toBe(
      '(t.created_at <= $1::timestamptz AND ((t.created_at < $1::timestamptz) OR (t.created_at = $1::timestamptz AND t.id > $2::bigint)))',
    );
    // 同一个参数在 SQL 里出现多次,但只传一次
    expect(params).toEqual(['2025-01-01T00:00:00.000Z', 42]);
  });

  it('方向混合且第一列升序(title, -id):冗余范围是 >=,并且带上 COLLATE "C"', () => {
    const { sql } = build(
      [
        { field: 'title', dir: 'asc' },
        { field: 'id', dir: 'desc' },
      ],
      ['b', 7],
    );
    expect(sql).toBe(
      '(t.title COLLATE "C" >= $1::text AND ((t.title COLLATE "C" > $1::text) OR (t.title COLLATE "C" = $1::text AND t.id < $2::bigint)))',
    );
  });
});

describe('escapeLike', () => {
  it('% _ 和反斜杠都当成普通字符', () => {
    expect(escapeLike('100%_a\\b')).toBe('100\\%\\_a\\\\b');
  });
});

// Day 36:transaction() 在各种失败路径上的行为。不连数据库:用一个假的连接池和假的连接,按 SQL 开头决定每条语句成功还是失败
describe('PgTasksRepository 的事务(Day 36 修复)', () => {
  type Step = 'BEGIN' | 'INSERT' | 'SELECT' | 'COMMIT' | 'ROLLBACK';
  const row = { id: '7', title: 't', done: false, created_at: new Date('2026-01-01T00:00:00Z'), checklist: [] };

  function setup(failures: Partial<Record<Step, Error>>) {
    const seen: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        const step = (['BEGIN', 'INSERT', 'SELECT', 'COMMIT', 'ROLLBACK'] as Step[]).find((s) => sql.trimStart().startsWith(s))!;
        seen.push(step);
        if (failures[step]) throw failures[step];
        if (step === 'INSERT') return { rows: [{ id: '7' }], rowCount: 1 };
        if (step === 'SELECT') return { rows: [row], rowCount: 1 };
        return { rows: [], rowCount: null };
      }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn(async () => client) } as unknown as pg.Pool;
    return { repo: new PgTasksRepository(pool), client, seen };
  }
  const create = (repo: PgTasksRepository) => repo.insert({ title: 't', done: false, checklist: [], createdAt: '2026-01-01T00:00:00.000Z' });

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('成功:BEGIN → INSERT → SELECT → COMMIT,连接正常还回池子(release 不带参数)', async () => {
    const { repo, client, seen } = setup({});
    await expect(create(repo)).resolves.toMatchObject({ id: 7, title: 't' });
    expect(seen).toEqual(['BEGIN', 'INSERT', 'SELECT', 'COMMIT']);
    expect(client.release).toHaveBeenCalledOnce();
    expect(client.release.mock.calls[0]?.[0]).toBeUndefined(); // 没传错误 = 连接还回池子继续用
  });

  it('中途失败、ROLLBACK 成功:抛出原来的错误,连接照常还回池子', async () => {
    const original = new Error('INSERT 失败');
    const { repo, client, seen } = setup({ INSERT: original });
    await expect(create(repo)).rejects.toBe(original);
    expect(seen).toEqual(['BEGIN', 'INSERT', 'ROLLBACK']);
    expect(client.release).toHaveBeenCalledOnce();
    expect(client.release.mock.calls[0]?.[0]).toBeUndefined(); // 没传错误 = 连接还回池子继续用
  });

  it('中途失败、ROLLBACK 也失败:仍然抛出原来的错误(不被 ROLLBACK 的错误顶掉),连接被丢弃,ROLLBACK 的错误记日志', async () => {
    const original = new Error('INSERT 失败');
    const rollbackErr = new Error('Connection terminated unexpectedly');
    const { repo, client } = setup({ INSERT: original, ROLLBACK: rollbackErr });
    await expect(create(repo)).rejects.toBe(original);
    expect(client.release).toHaveBeenCalledExactlyOnceWith(rollbackErr); // 传了错误 → pg-pool 销毁这个连接
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('Connection terminated unexpectedly'));
  });

  it('COMMIT 失败:尝试 ROLLBACK,抛出 COMMIT 的错误', async () => {
    const commitErr = new Error('COMMIT 失败');
    const { repo, client, seen } = setup({ COMMIT: commitErr });
    await expect(create(repo)).rejects.toBe(commitErr);
    expect(seen).toEqual(['BEGIN', 'INSERT', 'SELECT', 'COMMIT', 'ROLLBACK']);
    expect(client.release).toHaveBeenCalledOnce();
    expect(client.release.mock.calls[0]?.[0]).toBeUndefined(); // 没传错误 = 连接还回池子继续用
  });

  it('原来的错误是约束违反、ROLLBACK 又失败:调用方仍然收到翻译好的 422,而不是连接错误', async () => {
    const check = Object.assign(new pg.DatabaseError('new row violates check constraint', 0, 'error'), {
      code: '23514',
      constraint: 'tasks_title_check',
    });
    const { repo, client } = setup({ INSERT: check, ROLLBACK: new Error('Connection terminated unexpectedly') });
    const err = await create(repo).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProblemException);
    expect((err as ProblemException).getStatus()).toBe(422);
    expect(client.release).toHaveBeenCalledWith(expect.any(Error));
  });
});
