import type { Route } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";

export default async function NotFound() {
  const [t, locale] = await Promise.all([
    getTranslations("errors.notFound"),
    getLocale(),
  ]);
  const typedLocale = locale as Locale;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-24">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          404
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          {t("description")}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href={toHomeRoute(typedLocale)}>{t("primaryCta")}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href={toContactRoute(typedLocale)}>{t("secondaryCta")}</Link>
        </Button>
      </div>
    </main>
  );
}

function toHomeRoute(locale: Locale): Route<"/[locale]"> {
  return `/${locale}` as Route<"/[locale]">;
}

function toContactRoute(locale: Locale): Route<"/[locale]/contact"> {
  return `/${locale}/contact` as Route<"/[locale]/contact">;
}
