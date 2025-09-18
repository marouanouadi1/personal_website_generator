"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export interface PlayItem {
  id: string;
  title: string;
  meta?: string;
  description?: string;
  notes?: string[];
}

export interface PlayTabDefinition {
  id: string;
  label: string;
  description?: string;
  items: PlayItem[];
}

interface PlayTabsProps {
  tabs: PlayTabDefinition[];
  tablistLabel?: string;
  className?: string;
}

export function PlayTabs({ tabs, tablistLabel, className }: PlayTabsProps) {
  const instanceId = useId();
  const [activeTab, setActiveTab] = useState(() => tabs[0]?.id ?? "");

  useEffect(() => {
    if (!tabs.length) {
      setActiveTab("");
      return;
    }

    const firstTabId = tabs[0].id;

    setActiveTab((previous) => {
      if (!previous) {
        return firstTabId;
      }

      return tabs.some((tab) => tab.id === previous) ? previous : firstTabId;
    });
  }, [tabs]);

  const selectedTab = useMemo(() => {
    if (!tabs.length) {
      return undefined;
    }

    return tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  }, [activeTab, tabs]);

  if (!selectedTab) {
    return null;
  }

  const panelId = `${instanceId}-${selectedTab.id}-panel`;
  const tabId = `${instanceId}-${selectedTab.id}-tab`;

  return (
    <div className={cn("space-y-8", className)}>
      <div
        role="tablist"
        aria-label={tablistLabel}
        className="flex flex-wrap items-center gap-2"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === selectedTab.id;
          const controlId = `${instanceId}-${tab.id}-panel`;
          const currentTabId = `${instanceId}-${tab.id}-tab`;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={currentTabId}
              aria-selected={isActive}
              aria-controls={controlId}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 text-muted-foreground hover:border-primary/60 hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId}
        className="space-y-6"
      >
        {selectedTab.description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {selectedTab.description}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {selectedTab.items.map((item) => (
            <article
              key={item.id}
              className="flex h-full flex-col justify-between rounded-3xl border border-border/80 bg-background/90 p-6 shadow-sm"
            >
              <div className="space-y-4">
                <header className="space-y-1">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h3>
                  {item.meta ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                      {item.meta}
                    </p>
                  ) : null}
                </header>

                {item.description ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </div>

              {item.notes?.length ? (
                <ul className="mt-6 space-y-2 text-sm leading-relaxed text-muted-foreground">
                  {item.notes.map((note, index) => (
                    <li key={`${item.id}-note-${index}`} className="flex items-start gap-2">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
