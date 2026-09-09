// 读取 ../docs 里的每日讲义,和 ../roadmap.md 里的阶段总览。
// 这段代码只在 build 时跑一次(Next.js 的 Server Component),不会进浏览器。
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(process.cwd(), "..");

export type Day = {
  n: number;
  topic: string;
  summary: string;
  /** 讲义自带的 <style> 内容 */
  css: string;
  /** 讲义 <body> 里的 HTML */
  body: string;
};

export type Phase = { id: number; from: number; to: number; name: string };

let cache: Day[] | null = null;

export async function getDays(): Promise<Day[]> {
  if (cache) return cache;
  const days: Day[] = [];
  for (const dir of await readdir(join(ROOT, "docs"), { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const file of await readdir(join(ROOT, "docs", dir.name))) {
      if (!file.endsWith(".html")) continue;
      const html = await readFile(join(ROOT, "docs", dir.name, file), "utf8");
      const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1].trim() ?? file;
      const n = Number(title.match(/Day\s*(\d+)/i)?.[1] ?? dir.name.match(/\d+/)?.[0]);
      if (!n) continue;
      days.push({
        n,
        topic: title.replace(/^Day\s*\d+\s*[-–—]\s*/i, ""),
        summary: html.match(/<meta name="summary" content="([^"]*)"/)?.[1] ?? "",
        css: [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n"),
        body: html.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? "",
      });
    }
  }
  cache = days.sort((a, b) => a.n - b.n);
  return cache;
}

export async function getPhases(): Promise<Phase[]> {
  const md = await readFile(join(ROOT, "roadmap.md"), "utf8");
  return [...md.matchAll(/^## Phase (\d+)[(（]Day (\d+)[–-](\d+)[)）]:(.+)$/gm)].map(
    ([, id, from, to, name]) => ({ id: +id, from: +from, to: +to, name: name.trim() }),
  );
}
