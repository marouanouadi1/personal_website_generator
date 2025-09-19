"use server";

import { sendEmailWithResend } from "@/lib/resend";
import { verifyTurnstileToken } from "@/lib/turnstile";

export type ContactFormFieldError = "required" | "invalid";
export type ContactFormErrorCode = "turnstile" | "config" | "resend" | "unknown";

export interface ContactFormState {
  status: "idle" | "success" | "error";
  fieldErrors?: Partial<{
    name: ContactFormFieldError;
    email: ContactFormFieldError;
    message: ContactFormFieldError;
  }>;
  formError?: ContactFormErrorCode;
}

const initialState: ContactFormState = { status: "idle" };

export function getInitialContactState(): ContactFormState {
  return { ...initialState };
}

export async function submitContact(
  prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  void prevState;

  const name = getFormValue(formData, "name");
  const email = getFormValue(formData, "email");
  const message = getFormValue(formData, "message");
  const turnstileToken = getFormValue(formData, "cf-turnstile-response");

  const fieldErrors: ContactFormState["fieldErrors"] = {};

  if (!name) {
    fieldErrors.name = "required";
  }

  if (!email) {
    fieldErrors.email = "required";
  } else if (!isValidEmail(email)) {
    fieldErrors.email = "invalid";
  }

  if (!message) {
    fieldErrors.message = "required";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      fieldErrors,
    } satisfies ContactFormState;
  }

  if (!turnstileToken) {
    return {
      status: "error",
      formError: "turnstile",
    } satisfies ContactFormState;
  }

  try {
    const isValidTurnstile = await verifyTurnstileToken(turnstileToken);

    if (!isValidTurnstile) {
      return {
        status: "error",
        formError: "turnstile",
      } satisfies ContactFormState;
    }
  } catch (error) {
    console.error("Failed to verify Turnstile token", error);

    if (error instanceof Error && error.message.includes("TURNSTILE_SECRET_KEY")) {
      return {
        status: "error",
        formError: "config",
      } satisfies ContactFormState;
    }

    return {
      status: "error",
      formError: "turnstile",
    } satisfies ContactFormState;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const toEmail = process.env.CONTACT_RECIPIENT_EMAIL ?? fromEmail;

  if (!resendApiKey || !fromEmail || !toEmail) {
    console.error("Missing Resend configuration", {
      hasApiKey: Boolean(resendApiKey),
      hasFromEmail: Boolean(fromEmail),
      hasToEmail: Boolean(toEmail),
    });

    return {
      status: "error",
      formError: "config",
    } satisfies ContactFormState;
  }

  try {
    await sendEmailWithResend(resendApiKey, {
      from: fromEmail,
      to: toEmail,
      replyTo: email,
      subject: `New contact request from ${name}`,
      text: buildTextBody({ name, email, message }),
    });
  } catch (error) {
    console.error("Failed to send contact email", error);

    return {
      status: "error",
      formError: "resend",
    } satisfies ContactFormState;
  }

  return { status: "success" } satisfies ContactFormState;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function buildTextBody({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message: string;
}) {
  return `New contact request\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
}

export type SubmitContactAction = typeof submitContact;
