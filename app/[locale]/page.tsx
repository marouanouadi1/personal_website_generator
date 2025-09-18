import type { Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { locales, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

interface HomePageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const t = await getTranslations("index");
  const switcher = await getTranslations("localeSwitcher");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-12 px-6 py-[clamp(4rem,12vh,7.5rem)]">
      <section className="space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
          {t("eyebrow")}
        </p>
        <h1 className="text-balance text-[clamp(2.75rem,6vw,4rem)] font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="max-w-3xl text-balance text-[clamp(1.05rem,1.5vw,1.35rem)] text-muted-foreground">
          {t("description")}
        </p>
      </section>

      <div className="flex flex-col-reverse gap-3 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 sm:flex-row sm:items-center sm:justify-start sm:gap-4">
        <Button variant="secondary" asChild className="w-full sm:w-auto">
          <Link href={toLocaleRoute(locale)}>{t("secondaryCta")}</Link>
        </Button>
        <Button asChild className="w-full sm:w-auto">
          <Link href={toLocaleRoute(locale)}>{t("primaryCta")}</Link>
        </Button>
      </div>

      <div className="border-t pt-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 sm:pt-8">
        <p className="text-sm font-semibold text-muted-foreground">
          {switcher("label")}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {locales.map((candidateLocale) => (
            <Link
              key={candidateLocale}
              href={toLocaleRoute(candidateLocale)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                candidateLocale === locale
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
              )}
            >
              {switcher("options." + candidateLocale)}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

function toLocaleRoute(locale: Locale): Route<"/[locale]"> {
  return `/${locale}` as Route<"/[locale]">;
}
