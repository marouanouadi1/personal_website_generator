"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface HighlightItem {
  id: string;
  title: string;
  description: string;
}

export interface HighlightsSectionProps {
  eyebrow: string;
  title: string;
  description?: string;
  items: HighlightItem[];
}

export function HighlightsSection({
  eyebrow,
  title,
  description,
  items,
}: HighlightsSectionProps) {
  const [activeId, setActiveId] = useState(items[0]?.id);
  const labelGroupId = useId();

  const activeItem = items.find((item) => item.id === activeId) ?? items[0];

  if (!items.length || !activeItem) {
    return null;
  }

  return (
    <section
      className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200"
      aria-labelledby={`${labelGroupId}-title`}
    >
      <header className="space-y-3">
        <p
          id={`${labelGroupId}-eyebrow`}
          className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground"
        >
          {eyebrow}
        </p>
        <h2
          id={`${labelGroupId}-title`}
          className="text-3xl font-semibold tracking-tight text-foreground md:text-[clamp(2.1rem,4vw,2.75rem)]"
        >
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-wrap gap-3">
          {items.map((item, index) => {
            const isActive = item.id === activeItem.id;

            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "group relative inline-flex items-center gap-3 rounded-full border px-5 py-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isActive
                    ? "border-transparent bg-primary text-primary-foreground shadow-[0_18px_42px_-24px_rgba(59,130,246,0.65)]"
                    : "border-border/60 bg-background/70 text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-foreground",
                )}
                onMouseEnter={() => setActiveId(item.id)}
                onFocus={() => setActiveId(item.id)}
                onClick={() => setActiveId(item.id)}
                aria-pressed={isActive}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    isActive
                      ? "border-primary-foreground/60 bg-primary-foreground/10 text-primary-foreground"
                      : "border-border bg-background text-muted-foreground",
                  )}
                >
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>

        <article
          id={`${labelGroupId}-panel`}
          className="relative overflow-hidden rounded-3xl border border-border/70 bg-background/80 p-6 shadow-sm"
          aria-live="polite"
        >
          <div className="relative space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground/80">
              {activeItem.title}
            </p>
            <p
              id={`${labelGroupId}-item-${activeItem.id}`}
              className="text-base leading-relaxed text-muted-foreground"
            >
              {activeItem.description}
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
