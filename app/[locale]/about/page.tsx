import { getTranslations } from "next-intl/server";

import { CvNavigation } from "@/components/about/cv-navigation";
import type { Locale } from "@/lib/i18n/config";

interface AboutPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

interface RawCvEntry {
  id: string;
  title: string;
  subtitle?: string;
  period?: string;
  location?: string;
  description?: string;
  highlights?: Record<string, string>;
}

interface RawCvSection {
  id: string;
  title: string;
  description?: string;
  entries: Record<string, RawCvEntry>;
}

export default async function AboutPage({ params }: AboutPageProps) {
  await params;
  const t = await getTranslations("about");

  const eyebrow = t("eyebrow");
  const title = t("title");
  const description = t("description");
  const navigationLabel = t("navigation.label");
  const rawSections = t.raw("sections") as Record<string, RawCvSection>;
  const sections = Object.values(rawSections).map((section) => ({
    ...section,
    entries: Object.values(section.entries ?? {}),
  }));
  const navigationSections = sections.map((section) => ({
    id: section.id,
    title: section.title,
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

      <div className="flex flex-col gap-10 md:flex-row md:gap-12">
        <CvNavigation
          sections={navigationSections}
          label={navigationLabel}
          className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150"
        />

        <div className="flex-1 space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-28 space-y-8"
            >
              <header className="space-y-3">
                <h2 className="text-[clamp(2rem,4vw,2.75rem)] font-semibold tracking-tight text-foreground">
                  {section.title}
                </h2>
                {section.description ? (
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {section.description}
                  </p>
                ) : null}
              </header>

              <div className="space-y-6">
                {section.entries.map((entry) => {
                  const highlights = Object.values(entry.highlights ?? {});
                  const meta = [entry.period, entry.location].filter(Boolean).join(" • ");

                  return (
                    <article
                      key={entry.id ?? entry.title}
                      className="rounded-3xl border border-border/80 bg-background/90 p-6 shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <h3 className="text-xl font-semibold tracking-tight text-foreground">
                            {entry.title}
                          </h3>
                          {entry.subtitle ? (
                            <p className="text-sm font-medium text-muted-foreground">
                              {entry.subtitle}
                            </p>
                          ) : null}
                          {meta ? (
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                              {meta}
                            </p>
                          ) : null}
                        </div>

                        {entry.description ? (
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {entry.description}
                          </p>
                        ) : null}

                        {highlights.length ? (
                          <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                            {highlights.map((highlight) => (
                              <li key={highlight} className="flex items-start gap-2">
                                <span
                                  aria-hidden
                                  className="mt-2 h-1.5 w-1.5 rounded-full bg-primary"
                                />
                                <span>{highlight}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
