import Link from "next/link";
import { getDays, getPhases } from "@/lib/content";
import { t, asLocale } from "@/lib/i18n";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const m = t(locale);
  const days = await getDays();
  const phases = await getPhases();
  const latest = days.at(-1)?.n ?? 0;

  return (
    <>
      <header className="site-hero">
        <h1>{m.title}</h1>
        <p>{m.sub}</p>
        <span className="site-badge">{m.days}</span>
        <span className="site-badge">{m.hours}</span>
        <span className="site-badge">{m.updated(days.length)}</span>
      </header>

      <main className="site-wrap">
        <h2>📚 {m.lessons}</h2>
        <div className="site-days">
          {days.map((d) => (
            <Link key={d.n} className="site-card" href={`/${locale}/day/${d.n}/`}>
              <div className="no">{m.day.replace("%d", String(d.n)).toUpperCase()}</div>
              <p className="t">{d.topic}</p>
            </Link>
          ))}
        </div>

        <h2>🗺️ {m.plan}</h2>
        {phases.map((p) => (
          <div key={p.id} className={`site-phase${latest >= p.from ? " done" : ""}`}>
            <b>
              {m.phase} {p.id} · Day {p.from}–{p.to}
            </b>
            <span>{p.name}</span>
          </div>
        ))}

        <footer className="site-foot">{m.footer}</footer>
      </main>
    </>
  );
}
