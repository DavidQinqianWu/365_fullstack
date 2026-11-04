import { escapeLike, keysetCondition } from './pg-tasks.repository.js';
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
