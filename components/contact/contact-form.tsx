"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Script from "next/script";
import { useTranslations } from "next-intl";

import type {
  ContactFormState,
  SubmitContactAction,
} from "@/app/[locale]/contact/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n/config";

declare global {
  interface Window {
    turnstile?: {
      reset?: () => void;
    };
  }
}

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

interface ContactFormProps {
  action: SubmitContactAction;
  initialState: ContactFormState;
  siteKey: string | null;
  locale: Locale;
}

export function ContactForm({ action, initialState, siteKey, locale }: ContactFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const t = useTranslations("contact.form");

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      window.turnstile?.reset?.();
    }
  }, [state.status]);

  const statusMessage = useMemo(() => {
    if (state.status === "success") {
      return {
        tone: "success" as const,
        message: t("alerts.success"),
      };
    }

    if (state.status === "error") {
      if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
        return {
          tone: "error" as const,
          message: t("alerts.validation"),
        };
      }

      if (state.formError) {
        return {
          tone: "error" as const,
          message: t(`alerts.${state.formError}`),
        };
      }

      return {
        tone: "error" as const,
        message: t("alerts.unknown"),
      };
    }

    return null;
  }, [state, t]);

  if (!siteKey) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-6 text-muted-foreground">
        <p className="text-sm">{t("alerts.misconfigured")}</p>
      </div>
    );
  }

  return (
    <>
      <Script src={TURNSTILE_SCRIPT_SRC} async defer strategy="lazyOnload" />
      <form
        ref={formRef}
        action={formAction}
        className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <fieldset className="space-y-4" aria-describedby={statusMessage ? "contact-form-status" : undefined}>
          <legend className="text-lg font-semibold text-foreground">{t("legend")}</legend>

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              {t("fields.name.label")}
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={t("fields.name.placeholder")}
              aria-invalid={state.fieldErrors?.name ? "true" : undefined}
              aria-describedby={state.fieldErrors?.name ? "contact-name-error" : undefined}
              required
              autoComplete="name"
            />
            {state.fieldErrors?.name ? (
              <p id="contact-name-error" className="text-sm text-destructive">
                {t(`errors.name.${state.fieldErrors.name}`)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              {t("fields.email.label")}
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("fields.email.placeholder")}
              aria-invalid={state.fieldErrors?.email ? "true" : undefined}
              aria-describedby={state.fieldErrors?.email ? "contact-email-error" : undefined}
              required
              autoComplete="email"
            />
            {state.fieldErrors?.email ? (
              <p id="contact-email-error" className="text-sm text-destructive">
                {t(`errors.email.${state.fieldErrors.email}`)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium text-foreground">
              {t("fields.message.label")}
            </label>
            <Textarea
              id="message"
              name="message"
              placeholder={t("fields.message.placeholder")}
              rows={6}
              aria-invalid={state.fieldErrors?.message ? "true" : undefined}
              aria-describedby={state.fieldErrors?.message ? "contact-message-error" : undefined}
              required
            />
            {state.fieldErrors?.message ? (
              <p id="contact-message-error" className="text-sm text-destructive">
                {t(`errors.message.${state.fieldErrors.message}`)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div
              className="cf-turnstile"
              data-sitekey={siteKey}
              data-theme="light"
              data-language={locale}
            />
            {state.formError === "turnstile" ? (
              <p className="text-sm text-destructive">{t("errors.turnstile")}</p>
            ) : null}
          </div>
        </fieldset>

        <SubmitButton label={t("submit")} />

        {statusMessage ? (
          <div
            id="contact-form-status"
            role="status"
            className={
              statusMessage.tone === "success"
                ? "rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            }
          >
            {statusMessage.message}
          </div>
        ) : null}
      </form>
    </>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? `${label}…` : label}
    </Button>
  );
}
