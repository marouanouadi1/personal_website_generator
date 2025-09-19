import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

const FALLBACK_SITE_URL = "http://localhost:3000";

const normalizedSiteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL);

export const metadataBase = toMetadataBase(normalizedSiteUrl);

export const siteMetadata = {
  name: "Personal Website Generator",
  shortName: "Personal Website Generator",
  description: "Multilingual personal website experience built with Next.js, Tailwind CSS, shadcn/ui, and next-intl.",
  keywords: [
    "Next.js",
    "Tailwind CSS",
    "portfolio",
    "personal website",
    "localization",
  ],
};

export const TITLE_TEMPLATE = `%s | ${siteMetadata.shortName}`;

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  en: "en_US",
  it: "it_IT",
};

interface LocaleSeoContent {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  tagLine: string;
}

const localeSeoContent: Record<Locale, LocaleSeoContent> = {
  en: {
    title: "Personal Website Generator",
    description: "Multilingual experience powered by Next.js, Tailwind CSS, shadcn/ui, and next-intl.",
    ogTitle: "Craft personal websites with confidence",
    ogDescription: "Launch fast with typed tooling, localized content, and shadcn/ui primitives wired for iteration.",
    tagLine: "Launch fast with typed automation and localized content.",
  },
  it: {
    title: "Generatore di siti personali",
    description: "Esperienza multilingue costruita con Next.js, Tailwind CSS, shadcn/ui e next-intl.",
    ogTitle: "Crea siti personali con sicurezza",
    ogDescription: "Lancia rapidamente con tooling tipizzato, contenuti localizzati e componenti shadcn/ui pronti da personalizzare.",
    tagLine: "Tooling tipizzato e contenuti localizzati pronti al lancio.",
  },
};

const languageAlternates = locales.reduce<Record<string, string>>(
  (acc, locale) => {
    acc[locale] = `/${locale}`;
    return acc;
  },
  { "x-default": "/" }
);

export function getSiteUrl() {
  return normalizedSiteUrl;
}

export function getLanguageAlternates() {
  return { ...languageAlternates };
}

export function getCanonicalPath(locale: Locale) {
  return `/${locale}`;
}

export function getLocaleSeo(locale: Locale): LocaleSeoContent {
  return localeSeoContent[locale];
}

export function getOpenGraphLocale(locale: Locale) {
  return OPEN_GRAPH_LOCALES[locale];
}

export function getOpenGraphAlternateLocales(locale: Locale) {
  return locales.filter((candidate) => candidate !== locale).map((candidate) => OPEN_GRAPH_LOCALES[candidate]);
}

export function getOgImagePath(locale: Locale) {
  return `${getCanonicalPath(locale)}/opengraph-image`;
}

export function getDefaultOgImagePath() {
  return getOgImagePath(defaultLocale);
}

function normalizeSiteUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return FALLBACK_SITE_URL;
  }

  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;

  return withProtocol.replace(/\/+$/, "");
}

function toMetadataBase(url: string) {
  try {
    return new URL(url);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
}
