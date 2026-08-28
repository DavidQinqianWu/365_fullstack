// Day 3 习题辅助文件:造一个 200MB 大文件当"搬不完的大货"
// (已写好,直接 import 使用,不需要改)
import { existsSync } from "node:fs";
import { writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const BIG_FILE = join(here, ".tmp-big-file.bin");

export async function createFile() {
  if (existsSync(BIG_FILE)) return;
  const chunk = Buffer.alloc(1024 * 1024, "a"); // 1MB
  const parts = Array.from({ length: 200 }, () => chunk); // 200MB
  await writeFile(BIG_FILE, Buffer.concat(parts));
}

export async function cleanupFile() {
  await rm(BIG_FILE, { force: true });
}
