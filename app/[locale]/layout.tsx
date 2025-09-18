import { NextIntlClientProvider } from "next-intl";
import { getMessages, unstable_setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = parseLocale(rawLocale);

  const title = locale === "it" ? "Generatore di siti personali" : "Personal Website Generator";
  const description =
    locale === "it"
      ? "Esperienza multilingue costruita con Next.js, Tailwind CSS, shadcn/ui e next-intl."
      : "Multilingual experience powered by Next.js, Tailwind CSS, shadcn/ui, and next-intl.";

  return {
    title,
    description,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale: rawLocale } = await params;
  const locale = parseLocale(rawLocale);

  unstable_setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <div data-locale={locale} className="flex min-h-screen flex-col bg-background text-foreground">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}

function parseLocale(rawLocale: string): Locale {
  if (locales.includes(rawLocale as Locale)) {
    return rawLocale as Locale;
  }

  if (rawLocale === undefined || rawLocale === null) {
    return defaultLocale;
  }

  notFound();
}
