import { randomBytes, scrypt, type ScryptOptions } from 'node:crypto';

// Day 18:只是为了让 User 有一个「绝对不能出门」的字段。
// 真正的密码存储(参数选择、校验、升级哈希)在 Week 10 / Week 20 细讲。
// 存储格式:scrypt$<salt hex>$<hash hex>
function scryptAsync(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
