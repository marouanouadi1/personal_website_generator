"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

interface CvNavigationSection {
  id: string;
  title: string;
}

interface CvNavigationProps {
  sections: CvNavigationSection[];
  label: string;
  className?: string;
}

// Keeps section tracking in sync with the sticky header gap.
const SCROLL_OFFSET = 180;

export function CvNavigation({ sections, label, className }: CvNavigationProps) {
  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null);

  const updateActiveSection = useCallback(() => {
    if (!sectionIds.length) {
      return;
    }

    let nextActive: string | null = sectionIds[0] ?? null;

    for (const id of sectionIds) {
      const element = document.getElementById(id);

      if (!element) {
        continue;
      }

      const { top } = element.getBoundingClientRect();

      if (top - SCROLL_OFFSET <= 0) {
        nextActive = id;
      }
    }

    setActiveId((previous) => (previous === nextActive ? previous : nextActive));
  }, [sectionIds]);

  useEffect(() => {
    setActiveId(sectionIds[0] ?? null);
  }, [sectionIds]);

  useEffect(() => {
    if (!sectionIds.length) {
      return undefined;
    }

    updateActiveSection();

    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [sectionIds, updateActiveSection]);

  if (!sections.length) {
    return null;
  }

  return (
    <nav aria-label={label} className={cn("md:sticky md:top-28 md:h-fit md:min-w-[14rem]", className)}>
      <div className="rounded-3xl border border-border/80 bg-background/90 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {sections.map((section) => {
            const isActive = section.id === activeId;

            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={cn(
                    "inline-flex w-full items-center justify-between rounded-full border px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
                    isActive
                      ? "border-transparent bg-primary/10 text-foreground shadow-[0_16px_36px_-24px_rgba(59,130,246,0.6)]"
                      : "border-transparent text-muted-foreground hover:border-border/80 hover:text-foreground",
                  )}
                  aria-current={isActive ? "location" : undefined}
                  onClick={() => setActiveId(section.id)}
                  onFocus={() => setActiveId(section.id)}
                >
                  <span>{section.title}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "text-base transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground/80",
                    )}
                  >
                    →
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
