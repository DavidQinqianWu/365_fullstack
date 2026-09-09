import Link from "next/link";
import type { Metadata } from "next";
import { getDays } from "@/lib/content";
import { locales, t, asLocale } from "@/lib/i18n";

type Params = { locale: string; n: string };

// locale × day 的笛卡尔积。4 天 × 3 语言 = 12 个静态页面,build 时全部生成。
export async function generateStaticParams() {
  const days = await getDays();
  return locales.flatMap((locale) => days.map((d) => ({ locale, n: String(d.n) })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale: raw, n } = await params;
  const locale = asLocale(raw);
  const day = (await getDays()).find((d) => d.n === Number(n));
  return { title: `${t(locale).day.replace("%d", n)} · ${day?.topic ?? ""}` };
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

  return (
    <>
      {/* 讲义自带的样式,原样注入,不改动内容 */}
      <style dangerouslySetInnerHTML={{ __html: day.css }} />
      <p className="site-note"><Link href={`/${locale}/`}>← {m.back}</Link></p>
      {locale !== "zh" && <p className="site-note">🌐 {m.onlyZh}</p>}
      <article dangerouslySetInnerHTML={{ __html: day.body }} />
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
