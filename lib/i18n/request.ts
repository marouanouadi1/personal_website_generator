import type { AbstractIntlMessages } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, locales, type Locale } from "./config";

const messageLoaders: Record<Locale, () => Promise<AbstractIntlMessages>> = {
  en: () => import("../../messages/en.json").then((module) => module.default as AbstractIntlMessages),
  it: () => import("../../messages/it.json").then((module) => module.default as AbstractIntlMessages),
};

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const normalizedLocale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;

  const messages = await messageLoaders[normalizedLocale]();

  return {
    locale: normalizedLocale,
    messages,
  };
});
