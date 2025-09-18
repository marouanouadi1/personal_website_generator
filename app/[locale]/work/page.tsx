import { getTranslations } from "next-intl/server";

import { WorkListing, type WorkListingProps, type WorkProject } from "@/components/work-listing";

interface WorkPageProps {
  params: Promise<{
    locale: string;
  }>;
}

interface RawFilters {
  label: string;
  all: string;
  categories: Record<string, string>;
}

interface RawWorkProject {
  id: string;
  title: string;
  description: string;
  period: string;
  categories?: Record<string, string>;
  highlights?: Record<string, string>;
}

export default async function WorkPage({ params }: WorkPageProps) {
  await params;

  const t = await getTranslations("work");

  const eyebrow = t("eyebrow");
  const title = t("title");
  const description = t("description");
  const emptyMessage = t("empty");
  const rawFilters = t.raw("filters") as RawFilters;
  const rawProjects = t.raw("projects") as Record<string, RawWorkProject>;

  const filters: WorkListingProps["filters"] = [
    { id: "all", label: rawFilters.all },
    ...Object.entries(rawFilters.categories).map(([id, label]) => ({ id, label })),
  ];

  const categoryLabels = rawFilters.categories;
  const projects: WorkProject[] = Object.values(rawProjects).map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    period: project.period,
    categories: Object.values(project.categories ?? {}),
    highlights: project.highlights ? Object.values(project.highlights) : undefined,
  }));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-[clamp(4rem,12vh,7.5rem)]">
      <header className="space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="text-balance text-[clamp(2.5rem,5.5vw,3.5rem)] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="max-w-3xl text-balance text-[clamp(1rem,1.45vw,1.25rem)] text-muted-foreground">
          {description}
        </p>
      </header>

      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
        <WorkListing
          filterLabel={rawFilters.label}
          filters={filters}
          categoryLabels={categoryLabels}
          projects={projects}
          emptyMessage={emptyMessage}
        />
      </div>
    </main>
  );
}
