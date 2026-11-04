import pg from 'pg';
import { createToken } from '../common/typed-token.js';

// Day 27:连接池 = 账房门口固定的几位伙计。
// 每个连接在 PostgreSQL 那边是一个后端进程(Day 22 实测),开连接、断连接都很贵;
// 池子先请好最多 max 位伙计,请求来了借一位,办完还回来,下一个请求接着用。
export const PG_POOL = createToken<pg.Pool>('PG_POOL'); // Day 12:带类型的 token

export interface PoolSettings {
  connectionString: string;
  schema: string; // 已经过 env schema 的白名单校验(只含小写字母、数字、下划线)
  max: number;
}

export function createPool({ connectionString, schema, max }: PoolSettings): pg.Pool {
  return new pg.Pool({
    connectionString,
    max, // 最多同时几个连接。多副本部署时:副本数 × max 不能超过数据库的 max_connections(默认 100)
    idleTimeoutMillis: 10_000, // 空闲 10 秒的连接关掉,把进程还给数据库
    connectionTimeoutMillis: 3_000, // 池子满了、或者数据库连不上:最多等 3 秒就报错,不无限挂住
    application_name: 'nest-lab', // 在 pg_stat_activity 里认得出「这些连接是 nest-lab 的」
    // 表放在哪个 schema:连上以后执行 SET search_path。schema 名不能参数化,所以必须先过白名单
    options: `-c search_path=${schema}`,
  });
}
