import { getTranslations } from "next-intl/server";

import { PlayTabs, type PlayTabDefinition } from "@/components/play/play-tabs";
import type { Locale } from "@/lib/i18n/config";

interface PlayPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

interface RawPlayItem {
  id: string;
  title: string;
  meta?: string;
  description?: string;
  notes?: Record<string, string>;
}

interface RawPlayTab {
  id: string;
  label: string;
  description?: string;
  items: Record<string, RawPlayItem>;
}

export default async function PlayPage({ params }: PlayPageProps) {
  await params;

  const t = await getTranslations("play");

  const eyebrow = t("eyebrow");
  const title = t("title");
  const description = t("description");
  const tablistLabel = t("tablistLabel");
  const rawTabs = t.raw("tabs") as Record<string, RawPlayTab>;

  const tabs: PlayTabDefinition[] = Object.values(rawTabs).map((tab) => ({
    id: tab.id,
    label: tab.label,
    description: tab.description,
    items: Object.values(tab.items ?? {}).map((item) => ({
      id: item.id,
      title: item.title,
      meta: item.meta,
      description: item.description,
      notes: item.notes ? Object.values(item.notes) : undefined,
    })),
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
        <PlayTabs tabs={tabs} tablistLabel={tablistLabel} />
      </div>
    </main>
  );
}
