"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WorkProject {
  id: string;
  title: string;
  description: string;
  period: string;
  categories: string[];
  highlights?: string[];
}

export interface WorkListingProps {
  filterLabel: string;
  filters: {
    id: string;
    label: string;
  }[];
  categoryLabels: Record<string, string>;
  projects: WorkProject[];
  emptyMessage: string;
}

export function WorkListing({
  filterLabel,
  filters,
  categoryLabels,
  projects,
  emptyMessage,
}: WorkListingProps) {
  const defaultFilterId = filters[0]?.id ?? "all";
  const [activeFilter, setActiveFilter] = useState(defaultFilterId);

  const visibleProjects = useMemo(() => {
    if (!projects.length) {
      return [];
    }

    if (activeFilter === "all") {
      return projects;
    }

    return projects.filter((project) => project.categories.includes(activeFilter));
  }, [projects, activeFilter]);

  return (
    <section className="space-y-6">
      {filters.length > 1 ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {filterLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const isActive = filter.id === activeFilter;

              return (
                <Button
                  key={filter.id}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  className={cn(
                    "h-auto rounded-full border px-4 py-2 text-sm transition-all",
                    isActive ? "shadow-[0_18px_42px_-24px_rgba(59,130,246,0.65)]" : "bg-background/70",
                  )}
                  onClick={() => setActiveFilter(filter.id)}
                  aria-pressed={isActive}
                >
                  {filter.label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {visibleProjects.map((project) => (
          <article
            key={project.id}
            className="flex h-full flex-col justify-between rounded-3xl border border-border/80 bg-background/90 p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
                  {project.period}
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                  {project.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {project.description}
                </p>
              </div>

              {project.highlights && project.highlights.length > 0 ? (
                <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {project.highlights.map((highlight) => (
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

            <div className="mt-6 flex flex-wrap gap-2">
              {project.categories.map((categoryId) => (
                <span
                  key={`${project.id}-${categoryId}`}
                  className="inline-flex items-center rounded-full border border-border/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {categoryLabels[categoryId] ?? categoryId}
                </span>
              ))}
            </div>
          </article>
        ))}

        {visibleProjects.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-border/70 bg-muted/30 p-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
