// 把 docs/ 里的每日讲义生成一个静态网站到 site/
// 用法: node scripts/build-site.mjs
import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const SITE = { title: "AI 时代:从前端到全栈", sub: "帮助前端程序员一步一步成长为全栈程序员" };

// 1. 收集每日讲义
const days = [];
for (const dir of await readdir("docs", { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  for (const file of await readdir(join("docs", dir.name))) {
    if (!file.endsWith(".html")) continue;
    const html = await readFile(join("docs", dir.name, file), "utf8");
    const title = html.match(/<title>(.*?)<\/title>/s)?.[1].trim() ?? file;
    const n = Number(title.match(/Day\s*(\d+)/i)?.[1] ?? dir.name.match(/\d+/)?.[0]);
    const meta = (name) => html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1];
    days.push({
      n,
      topic: title.replace(/^Day\s*\d+\s*[-–—]\s*/i, ""),
      summary: meta("summary") ?? "",
      phase: meta("phase") ?? "",
      html,
    });
  }
}
days.sort((a, b) => a.n - b.n);

// 2. 从 roadmap.md 读阶段总览,保持与路线图同步
const roadmap = await readFile("roadmap.md", "utf8");
const phases = [...roadmap.matchAll(/^## Phase (\d+)(?:\(|\()Day (\d+)[–-](\d+)(?:\)|\)):(.+)$/gm)]
  .map(([, id, from, to, name]) => ({ id: +id, from: +from, to: +to, name: name.trim() }));

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const css = `
:root{--ink:#1f2430;--muted:#6b7280;--accent:#c2410c;--soft:#fff3ec;--paper:#fdfcf9;--line:#e5e1d8}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--paper);color:var(--ink);line-height:1.8}
a{color:var(--accent)}
.wrap{max-width:900px;margin:0 auto;padding:0 24px 96px}
.hero{background:var(--soft);border-bottom:3px double var(--line);padding:64px 24px 48px;margin-bottom:40px;text-align:center}
.hero h1{font-size:40px;margin:0 0 12px;line-height:1.3}
.hero p{color:var(--muted);margin:0 0 20px;font-size:17px}
.badge{display:inline-block;background:#fff;border:1px solid var(--line);border-radius:999px;padding:4px 14px;font-size:13px;color:var(--muted);margin:0 4px}
h2{font-size:22px;margin:48px 0 16px;padding-bottom:8px;border-bottom:1px solid var(--line)}
.days{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
.card{display:block;background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px 20px;text-decoration:none;color:inherit;transition:.15s}
.card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.06)}
.card .no{color:var(--accent);font-weight:700;font-size:13px;letter-spacing:1px}
.card .t{font-size:16px;font-weight:600;margin:6px 0 0;line-height:1.5}
.card .s{color:var(--muted);font-size:13px;margin-top:6px}
.phase{display:flex;gap:14px;padding:12px 0;border-bottom:1px dashed var(--line);align-items:baseline}
.phase b{color:var(--accent);white-space:nowrap;font-size:13px;min-width:130px}
.phase.done b::after{content:" ✓"}
footer{color:var(--muted);font-size:13px;text-align:center;margin-top:64px;padding-top:24px;border-top:1px solid var(--line)}
.topbar{position:sticky;top:0;background:rgba(253,252,249,.94);backdrop-filter:blur(6px);border-bottom:1px solid var(--line);padding:10px 24px;font-size:14px;z-index:99;display:flex;justify-content:space-between;gap:12px}
.nav{display:flex;justify-content:space-between;gap:12px;margin:48px 24px 64px;max-width:860px;margin-inline:auto}
.nav a{flex:1;border:1px solid var(--line);border-radius:10px;padding:14px 18px;text-decoration:none;background:#fff}
.nav a.next{text-align:right}
.nav span{display:block;color:var(--muted);font-size:12px}
`;

const shell = (title, body, extra = "") => `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(SITE.sub)}">
<style>${css}${extra}</style></head><body>${body}</body></html>`;

// 3. 首页
const latest = days.at(-1);
const cards = days.map((d) => `<a class="card" href="/day/${d.n}/">
  <div class="no">DAY ${d.n}</div><p class="t">${esc(d.topic)}</p>
  ${d.summary ? `<p class="s">${esc(d.summary)}</p>` : ""}</a>`).join("\n");
const plan = phases.map((p) => `<div class="phase${latest && latest.n >= p.from ? " done" : ""}">
  <b>Phase ${p.id} · Day ${p.from}–${p.to}</b><span>${esc(p.name)}</span></div>`).join("\n");

await rm("site", { recursive: true, force: true });
await mkdir("site", { recursive: true });
await writeFile("site/index.html", shell(SITE.title, `
<div class="hero">
  <h1>${esc(SITE.title)}</h1>
  <p>${esc(SITE.sub)}</p>
  <span class="badge">365 天</span><span class="badge">每天 3 小时</span>
  <span class="badge">已更新 ${days.length} 天</span>
</div>
<div class="wrap">
  <h2>📚 每日课程</h2>
  <div class="days">${cards}</div>
  <h2>🗺️ 全年计划</h2>
  ${plan}
  <footer>总有人说前端已死。与其争论,不如把后端补上。<br>内容持续更新中 · supergood-tech.de</footer>
</div>`));

// 4. 每天一页,加顶部返回条和上下篇导航
for (const [i, d] of days.entries()) {
  const prev = days[i - 1], next = days[i + 1];
  const bar = `<div class="topbar"><a href="/">← 返回目录</a><span>Day ${d.n} / 365</span></div>`;
  const nav = `<div class="nav">
    ${prev ? `<a href="/day/${prev.n}/"><span>← 上一天</span>Day ${prev.n} ${esc(prev.topic)}</a>` : "<span></span>"}
    ${next ? `<a class="next" href="/day/${next.n}/"><span>下一天 →</span>Day ${next.n} ${esc(next.topic)}</a>` : ""}
  </div>`;
  const page = d.html
    .replace(/<\/head>/i, `<style>${css}</style></head>`)
    .replace(/<body([^>]*)>/i, `<body$1>${bar}`)
    .replace(/<\/body>/i, `${nav}</body>`);
  await mkdir(`site/day/${d.n}`, { recursive: true });
  await writeFile(`site/day/${d.n}/index.html`, page);
}
console.log(`built: ${days.length} days, ${phases.length} phases`);
