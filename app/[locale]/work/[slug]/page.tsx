import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { allCaseStudies, getCaseStudy } from "@/content/case-studies";
import type { CaseStudyModule } from "@/content/case-studies";
import type { Locale } from "@/lib/i18n/config";

interface CaseStudyPageParams {
  locale: Locale;
  slug: string;
}

interface CaseStudyPageProps {
  params: Promise<CaseStudyPageParams>;
}

function resolveMeta(module: CaseStudyModule) {
  return module.meta ?? module.metadata;
}

export function generateStaticParams() {
  return allCaseStudies().map((caseStudy) => ({
    locale: caseStudy.locale,
    slug: caseStudy.slug,
  }));
}

export async function generateMetadata({
  params,
}: CaseStudyPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const definition = getCaseStudy(locale, slug);

  if (!definition) {
    return {};
  }

  const module = await definition.module();
  const meta = resolveMeta(module);

  if (!meta) {
    return {};
  }

  return {
    title: `${meta.title} · Case Study`,
    description: meta.description,
  } satisfies Metadata;
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { locale, slug } = await params;
  const definition = getCaseStudy(locale, slug);

  if (!definition) {
    notFound();
  }

  const module = await definition.module();
  const meta = resolveMeta(module);
  const Content = module.default;

  if (!meta || !Content) {
    notFound();
  }

  return <Content />;
}
