import type { Metadata } from "next";
import Link from "next/link";
import "../globals.css";
import { locales, localeNames, t, asLocale } from "@/lib/i18n";

const SITE = "https://www.supergood-tech.de";

// 告诉 Next:要为哪些 locale 生成静态页面。build 时跑一次。
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const m = t(locale);
  return {
    title: m.title,
    description: m.sub,
    // hreflang:告诉搜索引擎这三个页面是同一内容的不同语言,不是重复内容。
    alternates: {
      canonical: `${SITE}/${locale}/`,
      languages: Object.fromEntries(locales.map((l) => [l, `${SITE}/${l}/`])),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = asLocale((await params).locale);
  return (
    <html lang={locale}>
      <body>
        <div className="site-bar">
          <Link href={`/${locale}/`}><b>AI → Full-Stack</b></Link>
          <nav className="site-langs">
            {locales.map((l) => (
              <Link key={l} href={`/${l}/`} aria-current={l === locale ? "true" : undefined}>
                {localeNames[l]}
              </Link>
            ))}
          </nav>
        </div>
        {children}
      </body>
    </html>
  );
}
