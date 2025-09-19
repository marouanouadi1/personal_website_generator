import type { ComponentType } from "react";

import type { Locale } from "@/lib/i18n/config";

export interface CaseStudyOutcome {
  label: string;
  value: string;
}

export interface CaseStudyLink {
  label: string;
  href: string;
}

export interface CaseStudyMeta {
  slug: string;
  locale: Locale;
  title: string;
  summary: string;
  description: string;
  period: string;
  role: string;
  industry?: string;
  team?: string[];
  categories: string[];
  contributions: string[];
  outcomes: CaseStudyOutcome[];
  links?: CaseStudyLink[];
}

export interface CaseStudyModule {
  default: ComponentType;
  meta?: CaseStudyMeta;
  metadata?: CaseStudyMeta;
}

export interface CaseStudyDefinition {
  slug: string;
  locale: Locale;
  module: () => Promise<CaseStudyModule>;
}

const caseStudies: CaseStudyDefinition[] = [
  {
    slug: "atlas-commerce",
    locale: "en",
    module: () => import("./en/atlas-commerce.tsx") as Promise<CaseStudyModule>,
  },
];

export function allCaseStudies() {
  return caseStudies.slice();
}

export function getCaseStudies(locale: Locale) {
  return caseStudies.filter((caseStudy) => caseStudy.locale === locale);
}

export function getCaseStudy(locale: Locale, slug: string) {
  return caseStudies.find(
    (caseStudy) => caseStudy.locale === locale && caseStudy.slug === slug,
  );
}
