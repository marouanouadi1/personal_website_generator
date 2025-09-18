import Link from "next/link";
import type { ReactNode } from "react";

import type { CaseStudyMeta, CaseStudyOutcome } from "@/content/case-studies";
import { cn } from "@/lib/utils";

interface CaseStudyProps {
  meta: CaseStudyMeta;
  children: ReactNode;
}

function CaseStudyRoot({ meta, children }: CaseStudyProps) {
  const team = meta.team?.join(", ");

  return (
    <article className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-[clamp(4rem,12vh,7.5rem)]">
      <header className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground/80">
          <span>Case Study</span>
          <span
            aria-hidden
            className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 md:inline-flex"
          />
          <span>{meta.period}</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-balance text-[clamp(2.75rem,5vw,3.75rem)] font-semibold tracking-tight text-foreground">
            {meta.title}
          </h1>
          <p className="max-w-3xl text-balance text-[clamp(1.05rem,1.6vw,1.35rem)] text-muted-foreground">
            {meta.summary}
          </p>
        </div>

        {meta.categories.length ? (
          <div className="flex flex-wrap gap-2">
            {meta.categories.map((category) => (
              <span
                key={category}
                className="inline-flex items-center rounded-full border border-border/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                {category}
              </span>
            ))}
          </div>
        ) : null}

        <div className="grid gap-8 rounded-3xl border border-border/70 bg-background/85 p-8 shadow-sm md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <CaseStudyDetail label="Role" value={meta.role} />
              <CaseStudyDetail label="Timeline" value={meta.period} />
              <CaseStudyDetail label="Industry" value={meta.industry} />
              <CaseStudyDetail label="Team" value={team} />
            </div>

            {meta.links?.length ? <CaseStudyLinkList links={meta.links} /> : null}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <CaseStudyList label="Contributions" items={meta.contributions} />
            <CaseStudyOutcomes label="Outcomes" items={meta.outcomes} />
          </div>
        </div>
      </header>

      <div className="space-y-20">{children}</div>
    </article>
  );
}

interface CaseStudyDetailProps {
  label: string;
  value?: string | null;
}

function CaseStudyDetail({ label, value }: CaseStudyDetailProps) {
  if (!value) {
    return null;
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
        {label}
      </p>
      <p className="text-sm leading-relaxed text-foreground">{value}</p>
    </div>
  );
}

interface CaseStudyListProps {
  label: string;
  items: string[];
}

function CaseStudyList({ label, items }: CaseStudyListProps) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
        {label}
      </p>
      <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface CaseStudyOutcomesProps {
  label: string;
  items: CaseStudyOutcome[];
}

function CaseStudyOutcomes({ label, items }: CaseStudyOutcomesProps) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
        {label}
      </p>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {items.map((item) => (
          <div
            key={`${item.label}-${item.value}`}
            className="rounded-2xl border border-border/60 bg-muted/10 p-4"
          >
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground/70">
              {item.label}
            </p>
            <p className="mt-2 text-base font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CaseStudyLinkListProps {
  links: NonNullable<CaseStudyMeta["links"]>;
}

function CaseStudyLinkList({ links }: CaseStudyLinkListProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
        Links
      </p>
      <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex items-center gap-2 font-medium text-foreground transition-colors hover:text-primary"
            >
              <span>{link.label}</span>
              <span aria-hidden className="text-muted-foreground/70">
                ↗
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface CaseStudySectionProps {
  label: string;
  badge: string;
  title: string;
  summary?: string;
  children: ReactNode;
  className?: string;
}

function CaseStudySection({
  label,
  badge,
  title,
  summary,
  className,
  children,
}: CaseStudySectionProps) {
  return (
    <section className={cn("space-y-6", className)} aria-labelledby={sectionId(title)}>
      <div className="flex flex-wrap items-start gap-4">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-primary/10 text-sm font-semibold uppercase tracking-[0.28em] text-primary">
          {badge}
        </span>
        <div className="space-y-2" id={sectionId(title)}>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
            {label}
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {summary ? (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {summary}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_blockquote]:border-l [&_blockquote]:border-border/60 [&_blockquote]:pl-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

function sectionId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface VariantSectionProps {
  title: string;
  summary?: string;
  children: ReactNode;
  className?: string;
}

type CaseStudyComponent = ((props: CaseStudyProps) => JSX.Element) & {
  Section: typeof CaseStudySection;
  Setup: (props: VariantSectionProps) => JSX.Element;
  Framing: (props: VariantSectionProps) => JSX.Element;
  Delivery: (props: VariantSectionProps) => JSX.Element;
  Results: (props: VariantSectionProps) => JSX.Element;
  Reflection: (props: VariantSectionProps) => JSX.Element;
};

function createVariant(label: string, badge: string) {
  return function VariantSection(props: VariantSectionProps) {
    return <CaseStudySection label={label} badge={badge} {...props} />;
  };
}

export const CaseStudy = Object.assign(CaseStudyRoot, {
  Section: CaseStudySection,
  Setup: createVariant("Setup", "S"),
  Framing: createVariant("Framing", "F"),
  Delivery: createVariant("Delivery", "D"),
  Results: createVariant("Results", "R"),
  Reflection: createVariant("Reflection", "R"),
}) as CaseStudyComponent;

export type { CaseStudyMeta };
