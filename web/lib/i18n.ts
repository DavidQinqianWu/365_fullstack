// 三语文案。只有 3 种语言、几十个词,一个对象就够,不需要 i18n 库。
// 库多帮你做的是:复数规则、日期格式、按需加载语言包。等真的需要了再换。
export const locales = ["zh", "en", "de"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh";

export const localeNames: Record<Locale, string> = { zh: "中文", en: "English", de: "Deutsch" };

const dict = {
  zh: {
    title: "AI 时代:从前端到全栈",
    sub: "帮助前端程序员一步一步成长为全栈程序员",
    days: "365 天",
    hours: "每天 3 小时",
    updated: (n: number) => `已更新 ${n} 天`,
    lessons: "每日课程",
    plan: "全年计划",
    day: "第 %d 天",
    back: "返回目录",
    prev: "上一天",
    next: "下一天",
    onlyZh: "本篇讲义目前只有中文版。英文与德文翻译计划在 Week 46 完成。",
    footer: "总有人说前端已死。与其争论,不如把后端补上。",
    phase: "阶段",
  },
  en: {
    title: "The AI Era: From Frontend to Full-Stack",
    sub: "A step-by-step path for frontend developers to become full-stack developers",
    days: "365 days",
    hours: "3 hours a day",
    updated: (n: number) => `${n} days published`,
    lessons: "Daily lessons",
    plan: "The year plan",
    day: "Day %d",
    back: "All lessons",
    prev: "Previous day",
    next: "Next day",
    onlyZh: "This lesson is available in Chinese only for now. English and German translations are planned for Week 46.",
    footer: "People keep saying frontend is dead. Instead of arguing, learn the backend.",
    phase: "Phase",
  },
  de: {
    title: "Die KI-Ära: Vom Frontend zum Full-Stack",
    sub: "Ein Schritt-für-Schritt-Weg für Frontend-Entwickler zum Full-Stack-Entwickler",
    days: "365 Tage",
    hours: "3 Stunden pro Tag",
    updated: (n: number) => `${n} Tage veröffentlicht`,
    lessons: "Tägliche Lektionen",
    plan: "Jahresplan",
    day: "Tag %d",
    back: "Alle Lektionen",
    prev: "Vorheriger Tag",
    next: "Nächster Tag",
    onlyZh: "Diese Lektion ist derzeit nur auf Chinesisch verfügbar. Englische und deutsche Übersetzungen sind für Woche 46 geplant.",
    footer: "Man sagt oft, Frontend sei tot. Statt zu streiten: lerne das Backend.",
    phase: "Phase",
  },
} satisfies Record<Locale, Record<string, unknown>>;

export const t = (locale: Locale) => dict[locale];

// 路由参数从 URL 来,类型是 string(不可信)。这里把它收窄成 Locale(可信)。
// 这就是「信任边界」:外部输入进来的地方,必须校验一次。
export const asLocale = (s: string): Locale =>
  (locales as readonly string[]).includes(s) ? (s as Locale) : defaultLocale;
