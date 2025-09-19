import { NextIntlClientProvider } from "next-intl";
import { getMessages, unstable_setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  OG_IMAGE_SIZE,
  TITLE_TEMPLATE,
  getCanonicalPath,
  getLanguageAlternates,
  getLocaleSeo,
  getOgImagePath,
  getOpenGraphAlternateLocales,
  getOpenGraphLocale,
  siteMetadata,
} from "@/lib/seo/config";
import { defaultLocale, isLocale, locales, type Locale } from "@/lib/i18n/config";

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

  const seo = getLocaleSeo(locale);
  const ogImagePath = getOgImagePath(locale);

  return {
    title: {
      default: seo.title,
      template: TITLE_TEMPLATE,
    },
    description: seo.description,
    alternates: {
      canonical: getCanonicalPath(locale),
      languages: getLanguageAlternates(),
    },
    openGraph: {
      type: "website",
      siteName: siteMetadata.name,
      locale: getOpenGraphLocale(locale),
      alternateLocale: getOpenGraphAlternateLocales(locale),
      url: getCanonicalPath(locale),
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [
        {
          url: ogImagePath,
          width: OG_IMAGE_SIZE.width,
          height: OG_IMAGE_SIZE.height,
          alt: seo.ogTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [ogImagePath],
    },
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
  if (isLocale(rawLocale)) {
    return rawLocale;
  }

  if (rawLocale === undefined || rawLocale === null) {
    return defaultLocale;
  }

  notFound();
}
