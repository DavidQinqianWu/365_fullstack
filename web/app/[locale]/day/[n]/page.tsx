import Link from "next/link";
import type { Metadata } from "next";
import { getDays } from "@/lib/content";
import { locales, t, asLocale } from "@/lib/i18n";
import { getContentInLocale } from "@/lib/translations";

type Params = { locale: string; n: string };

export async function generateStaticParams() {
  const days = await getDays();
  return locales.flatMap((locale) => days.map((d) => ({ locale, n: String(d.n) })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, n } = await params;
  const day = (await getDays()).find((d) => d.n === Number(n));
  return { title: `${t(asLocale(locale)).day.replace("%d", n)} · ${day?.topic ?? ""}` };
}

export default async function DayPage({ params }: { params: Promise<Params> }) {
  const { locale: raw, n } = await params;
  const locale = asLocale(raw);
  const m = t(locale);
  const days = await getDays();
  const i = days.findIndex((d) => d.n === Number(n));
  const day = days[i];
  if (!day) return null;
  const prev = days[i - 1];
  const next = days[i + 1];

  // 使用翻译(如果有的话)
  const displayBody = getContentInLocale(day.n, locale, day.body);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: day.css }} />
      {locale !== "zh" && <p className="site-note">🌐 {m.onlyZh}</p>}
      <article dangerouslySetInnerHTML={{ __html: displayBody }} />
      <nav className="site-nav">
        {prev ? (
          <Link href={`/${locale}/day/${prev.n}/`}>
            <span>← {m.prev}</span>
            {m.day.replace("%d", String(prev.n))} {prev.topic}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="next" href={`/${locale}/day/${next.n}/`}>
            <span>{m.next} →</span>
            {m.day.replace("%d", String(next.n))} {next.topic}
          </Link>
        )}
      </nav>
    </>
  );
}
