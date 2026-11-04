import { Logger, type OnModuleInit } from '@nestjs/common';
import type pg from 'pg';
import { ProblemException } from '../common/problems/problem.exception.js';
import { ProblemTypes } from '../common/problems/problem-types.js';
import { isPgError, translatePgError } from '../database/pg-errors.js';
import type { ChecklistItem, Task, TaskWritable } from './task.js';
import type { SortField, SortKey, TaskQuery } from './task-query.js';
import type { TasksRepository, UpdateResult } from './tasks.repository.js';

const logger = new Logger('PgTasksRepository');

// Day 27:仓储的第二个实现 —— 后厨从「临时冰柜」(内存数组)换成「中央仓库」(PostgreSQL)。
// 表结构见 sql/schema.sql(约束沿用 Day 24 的设计,checklist 按 Day 26 的决定放在子表)。
//
// 三条铁律:
//   ① 用户给的「值」一律走参数($1, $2 …),绝不拼进 SQL 字符串 —— 防 SQL 注入
//   ② 列名、排序方向不是「值」,不能参数化 → 只从下面这张白名单里取,用户输入只用来「选」哪一项
//   ③ 一次业务操作要写两张表时(任务 + 清单项),用同一个连接包在 BEGIN … COMMIT 里

// 排序字段(Day 19 的 SORTABLE_FIELDS)→ SQL 表达式。title 用 COLLATE "C"(按字节 / 码点比较),
// 和内存版的 JS 字符串比较结果一致,也不受数据库默认 locale 影响(Docker 的 postgres 镜像默认是 en_US.utf8)
const SORT_SQL: Record<SortField, { expr: string; cast: string }> = {
  id: { expr: 't.id', cast: 'bigint' },
  createdAt: { expr: 't.created_at', cast: 'timestamptz' },
  title: { expr: 't.title COLLATE "C"', cast: 'text' },
};

// 读一个任务时,顺便用 LATERAL 子查询把它的清单项拼成 JSON 数组(Day 26 的 json_agg + coalesce)
const SELECT_TASKS = `
  SELECT t.id, t.title, t.done, t.created_at, t.version, coalesce(cl.items, '[]'::json) AS checklist
  FROM tasks t
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('text', c.text, 'done', c.done) ORDER BY c.position) AS items
    FROM checklist_items c
    WHERE c.task_id = t.id
  ) cl ON true`;

interface TaskRow {
  id: string; // bigint 在 pg 驱动里默认读成字符串(JS 的 number 装不下完整的 64 位整数)
  title: string;
  done: boolean;
  created_at: Date; // timestamptz → Date(一个绝对时刻)
  checklist: ChecklistItem[]; // json → 驱动已经解析成对象
  version: number; // integer → number(32 位,驱动直接给 number)
}

// 数据库的一行 → 内部模型 Task(Day 18:内部模型和 API 表示分开,这里只是又多了一层「表示」)
function toTask(row: TaskRow): Task {
  return {
    id: Number(row.id), // 2^53 以内是安全的;真到那一天,API 里的 id 也得换成字符串(破坏性变更)
    title: row.title,
    done: row.done,
    checklist: row.checklist,
    createdAt: row.created_at.toISOString(),
    version: row.version,
  };
}

// LIKE 里 % 和 _ 是通配符,\ 是转义符:用户想搜「100%」时,% 要当成普通字符
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

// keyset 分页的 WHERE 条件:「排在书签之后」
//   方向全部相同:行值比较 (a, b, id) > ($1, $2, $3) —— 一个条件,数据库也最容易用上索引(Week 5)
//   方向混合(如 -createdAt, id):行值比较只有一个方向,不能用 → 展开成 OR:
//     a < $1 OR (a = $1 AND id > $2)
//   Day 34 修复:OR 本身用不上索引(只能当 Filter,深分页时要从头扫、扔掉前面所有行,Day 31 实测)。
//   在前面补一个「第一列的范围」:a <= $1 AND (a < $1 OR (a = $1 AND id > $2))。
//   它是 OR 的必要条件(两个分支都满足它),所以结果完全不变;但它是简单的范围,能成为 Index Cond,
//   索引直接跳到书签那里。
export function keysetCondition(sort: SortKey[], values: unknown[], param: (v: unknown) => string): string {
  const cols = sort.map((s) => SORT_SQL[s.field]);
  const placeholders = sort.map((s, i) => `${param(values[i])}::${cols[i]!.cast}`);
  const sameDirection = sort.every((s) => s.dir === sort[0]!.dir);
  if (sameDirection) {
    const op = sort[0]!.dir === 'asc' ? '>' : '<';
    return `(${cols.map((c) => c.expr).join(', ')}) ${op} (${placeholders.join(', ')})`;
  }
  const ors = sort.map((s, i) => {
    const equals = sort.slice(0, i).map((_, j) => `${cols[j]!.expr} = ${placeholders[j]}`);
    const op = s.dir === 'asc' ? '>' : '<';
    return `(${[...equals, `${cols[i]!.expr} ${op} ${placeholders[i]}`].join(' AND ')})`;
  });
  const range = `${cols[0]!.expr} ${sort[0]!.dir === 'asc' ? '>=' : '<='} ${placeholders[0]}`;
  return `(${range} AND (${ors.join(' OR ')}))`;
}

export class PgTasksRepository implements TasksRepository, OnModuleInit {
  constructor(
    private readonly pool: pg.Pool,
    // DB_RESET_ON_START=true 时:启动时清空并写入样品数据(和内存版一样「每次开店都是新的」);否则为 null
    private readonly resetSeed: Task[] | null = null,
  ) {}

  async onModuleInit(): Promise<void> {
    // 启动时先连一次:数据库连不上就让应用启动失败(fail fast,Day 12),而不是等第一个请求才 500
    await this.pool.query('SELECT 1');
    if (!this.resetSeed) return;
    // RESTART IDENTITY:序列也从 1 重新开始,样品任务的 id 和内存版一样是 1、2
    await this.pool.query('TRUNCATE tasks RESTART IDENTITY CASCADE');
    for (const t of this.resetSeed) {
      await this.insert({ title: t.title, done: t.done, checklist: t.checklist, createdAt: t.createdAt });
    }
  }

  async findAll(): Promise<Task[]> {
    const { rows } = await this.pool.query<TaskRow>(`${SELECT_TASKS} ORDER BY t.id`);
    return rows.map(toTask);
  }

  async findById(id: number, client: pg.Pool | pg.PoolClient = this.pool): Promise<Task | undefined> {
    const { rows } = await client.query<TaskRow>(`${SELECT_TASKS} WHERE t.id = $1`, [id]);
    return rows[0] ? toTask(rows[0]) : undefined;
  }

  // POST:任务和清单项一起写 —— 要么都成功,要么都不留下
  async insert(data: Omit<Task, 'id' | 'version'>): Promise<Task> {
    return this.transaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        'INSERT INTO tasks (title, done, created_at) VALUES ($1, $2, $3) RETURNING id',
        [data.title, data.done, data.createdAt],
      );
      const id = Number(rows[0]!.id);
      await this.writeChecklist(client, id, data.checklist);
      return (await this.findById(id, client))!;
    });
  }

  // PUT / PATCH:只改给了的字段;给了 checklist 就整份替换(先删后插)
  // Day 40:乐观锁 —— 「读」不加锁,「写」时带上读到的版本号:
  //   UPDATE tasks SET …, version = version + 1 WHERE id = $1 AND version = $2
  // 两个请求都读到 version 3、都来写:第一个把它改成 4;第二个的 WHERE version = 3 匹配不到行(rowCount 0)。
  // 第二个 UPDATE 如果在第一个提交前就到了,会先等第一个的行锁(Day 39),第一个提交后它重新检查 WHERE(PG 在 RC 下
  // 对更新后的行重新求值,Day 37)—— 看到的已经是 version 4,于是 0 行。所以不需要更高的隔离级别,Read Committed 就够。
  // rowCount 0 有两种可能:行没了(404)/ 版本变了(409),再查一次区分。
  async update(id: number, changes: Partial<TaskWritable>, expectedVersion?: number): Promise<UpdateResult> {
    return this.transaction(async (client) => {
      if (!(await this.writeChanges(client, id, changes, expectedVersion))) {
        if (expectedVersion === undefined) return { status: 'not-found' };
        const { rowCount } = await client.query('SELECT 1 FROM tasks WHERE id = $1', [id]);
        return rowCount ? { status: 'stale' } : { status: 'not-found' };
      }
      return { status: 'updated', task: (await this.findById(id, client))! };
    });
  }

  // Day 40:悲观锁 —— 先把这一行锁住,再读、判断、写,锁一直持有到 COMMIT。
  // FOR NO KEY UPDATE 而不是 FOR UPDATE:我们不改主键,不需要挡住「插入引用这个任务的 checklist_items」时的外键检查
  // (它要的是 FOR KEY SHARE:和 FOR UPDATE 冲突、和 FOR NO KEY UPDATE 不冲突,Day 39 的行锁兼容表)。
  // 锁只加在 tasks 这一行上:SELECT_TASKS 里有 json_agg,所以分两步 ——
  // 先 SELECT 1 … FOR NO KEY UPDATE 拿锁,再在同一个事务里 findById 读最新内容。
  async updateLocked(id: number, decide: (current: Task) => Partial<TaskWritable>): Promise<Task | undefined> {
    return this.transaction(async (client) => {
      const { rowCount } = await client.query('SELECT 1 FROM tasks WHERE id = $1 FOR NO KEY UPDATE', [id]);
      if (!rowCount) return undefined;
      const current = (await this.findById(id, client))!; // 锁已经在手:别人改不了,读到的就是最新的
      const changes = decide(current); // 抛异常 → transaction() 回滚,锁释放
      await this.writeChanges(client, id, changes);
      return this.findById(id, client);
    });
  }

  async remove(id: number): Promise<Task | undefined> {
    const task = await this.findById(id);
    if (!task) return undefined;
    try {
      // 清单项由外键 ON DELETE CASCADE 一起删掉(Day 24)
      const { rowCount } = await this.pool.query('DELETE FROM tasks WHERE id = $1', [id]);
      return rowCount ? task : undefined;
    } catch (err) {
      throw translatePgError(err, 'delete');
    }
  }

  // Day 19 的查询描述 → 真实的 WHERE / ORDER BY / LIMIT / OFFSET
  async findPage(query: TaskQuery): Promise<Task[]> {
    const { filter, sort, limit, after, offset } = query;
    const params: unknown[] = [];
    const param = (value: unknown) => `$${params.push(value)}`;
    const where: string[] = [];
    if (filter.done !== undefined) where.push(`t.done = ${param(filter.done)}`);
    if (filter.q !== undefined) where.push(`t.title ILIKE ${param(`%${escapeLike(filter.q)}%`)} ESCAPE '\\'`);
    if (after) {
      if (after.values.length !== sort.length) throw new ProblemException(ProblemTypes.invalidCursor, 'cursor 格式不正确');
      where.push(keysetCondition(sort, after.values, param));
    }
    // ORDER BY 的列名和方向:只从白名单里选(SortField 已经被 DTO 的 @IsIn 限制过,这里是第二道墙)
    const orderBy = sort.map((s) => `${SORT_SQL[s.field].expr} ${s.dir === 'desc' ? 'DESC' : 'ASC'}`).join(', ');
    const sql = [
      SELECT_TASKS,
      where.length ? `WHERE ${where.join(' AND ')}` : '',
      `ORDER BY ${orderBy}`,
      `LIMIT ${param(limit)}`,
      offset ? `OFFSET ${param(offset)}` : '',
    ].join('\n');
    try {
      const { rows } = await this.pool.query<TaskRow>(sql, params);
      return rows.map(toTask);
    } catch (err) {
      // cursor 被篡改成「不是时间 / 不是数字」的值时,PG 报 22xxx(数据格式错误)→ 当成无效的 cursor
      if (isPgError(err) && err.code?.startsWith('22')) {
        throw new ProblemException(ProblemTypes.invalidCursor, 'cursor 内容无效,请从第一页重新开始');
      }
      throw err;
    }
  }

  // 改 tasks 这一行(版本号 + 1),给了 checklist 就整份替换。返回 false = 没有匹配的行(行不存在,或版本对不上)
  // 即使只改 checklist,tasks 这一行也要 UPDATE:版本号必须跟着变,不然别人察觉不到「清单被改过」
  private async writeChanges(
    client: pg.PoolClient,
    id: number,
    changes: Partial<TaskWritable>,
    expectedVersion?: number,
  ): Promise<boolean> {
    // 列名来自代码里的固定清单(不是用户输入),值走参数
    const params: unknown[] = [id];
    const sets: string[] = ['version = version + 1'];
    if (changes.title !== undefined) sets.push(`title = $${params.push(changes.title)}`);
    if (changes.done !== undefined) sets.push(`done = $${params.push(changes.done)}`);
    const versionCheck = expectedVersion === undefined ? '' : ` AND version = $${params.push(expectedVersion)}`;
    const { rowCount } = await client.query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = $1${versionCheck}`, params);
    if (rowCount === 0) return false;
    if (changes.checklist !== undefined) {
      await client.query('DELETE FROM checklist_items WHERE task_id = $1', [id]);
      await this.writeChecklist(client, id, changes.checklist);
    }
    return true;
  }

  // 一次写入所有清单项:两个数组按位置对齐展开,WITH ORDINALITY 给出 1, 2, 3 … 作为 position
  private async writeChecklist(client: pg.PoolClient, taskId: number, items: ChecklistItem[]): Promise<void> {
    if (items.length === 0) return;
    await client.query(
      `INSERT INTO checklist_items (task_id, position, text, done)
       SELECT $1, x.position, x.text, x.done
       FROM unnest($2::text[], $3::boolean[]) WITH ORDINALITY AS x(text, done, position)`,
      [taskId, items.map((i) => i.text), items.map((i) => i.done)],
    );
  }

  // 事务必须在「同一个连接」上:BEGIN、INSERT、COMMIT 如果各自 pool.query(),
  // 可能被分到三个不同的连接(三位不同的伙计),BEGIN 开的事务和 INSERT 根本不在一起
  //
  // Day 36 修复了两个缺陷:
  //   ① 以前 ROLLBACK 自己也失败时(比如连接已经断了),await 'ROLLBACK' 抛出的错误会顶掉原来的错误,
  //      调用方和日志里只剩一句「连接断了」,真正的原因(约束违反、哪条 SQL 出错)丢了。
  //      现在:原来的错误优先抛出,ROLLBACK 的错误只记日志。
  //   ② 以前不管发生什么都 client.release(),把一个「ROLLBACK 都没成功、不知道还在不在事务里」的连接放回池子,
  //      下一个借到它的请求可能一开口就是 current transaction is aborted。
  //      现在:ROLLBACK 失败时 release(err),让池子销毁这个连接、下次新建一个。
  //      (pg-pool 3.x 自己也会丢掉「已经断开、不能再查询」的连接;release(err) 管的是它判断不了的情况:
  //       连接看起来还活着,但我们不知道它处在什么状态。)
  private async transaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let broken: Error | undefined; // 不为空 = 这个连接的状态不可信,不能还回池子
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        broken = rollbackErr instanceof Error ? rollbackErr : new Error(String(rollbackErr));
        logger.error(`ROLLBACK 失败,丢弃这个连接(原来的错误照常抛出):${broken.message}`);
      }
      throw translatePgError(err);
    } finally {
      client.release(broken); // 把伙计还回池子;传了错误 = 这位伙计不能再接客,池子换一个新的
    }
  }
}
