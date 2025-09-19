"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";

interface LocaleErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LocaleError({ error, reset }: LocaleErrorProps) {
  const t = useTranslations("errors.serverError");
  const locale = useLocale() as Locale;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-24">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          500
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          {t("description")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("digestLabel")}: <span className="font-mono">{error.digest ?? t("digestUnavailable")}</span>
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>{t("primaryCta")}</Button>
        <Button asChild variant="ghost">
          <Link href={toContactRoute(locale)}>{t("secondaryCta")}</Link>
        </Button>
      </div>
    </main>
  );
}

function toContactRoute(locale: Locale): Route<"/[locale]/contact"> {
  return `/${locale}/contact` as Route<"/[locale]/contact">;
}
