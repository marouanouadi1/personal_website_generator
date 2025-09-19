import { getTranslations } from "next-intl/server";

import { ContactForm } from "@/components/contact/contact-form";
import { getInitialContactState, submitContact } from "./actions";
import type { Locale } from "@/lib/i18n/config";

interface ContactPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

interface RawHighlight {
  title: string;
  description: string;
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;

  const t = await getTranslations("contact");
  const highlights = Object.values(t.raw("highlights") as Record<string, RawHighlight>);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-[clamp(4rem,12vh,7.5rem)]">
      <header className="space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
          {t("eyebrow")}
        </p>
        <h1 className="text-balance text-[clamp(2.5rem,5.5vw,3.5rem)] font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="max-w-3xl text-balance text-[clamp(1rem,1.45vw,1.25rem)] text-muted-foreground">
          {t("description")}
        </p>
      </header>

      <div className="grid gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="space-y-6 self-start rounded-lg border border-border bg-muted/10 p-6">
          <h2 className="text-base font-semibold text-foreground">
            {t("highlightsTitle")}
          </h2>
          <ul className="space-y-4">
            {highlights.map((highlight) => (
              <li key={highlight.title} className="space-y-1">
                <p className="text-sm font-medium text-foreground">{highlight.title}</p>
                <p className="text-sm text-muted-foreground">{highlight.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <ContactForm
          action={submitContact}
          initialState={await getInitialContactState()}
          siteKey={siteKey}
          locale={locale}
        />
      </div>
    </main>
  );
}
