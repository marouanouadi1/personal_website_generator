const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface ResendEmailPayload {
  from: string;
  to: string | string[];
  replyTo?: string;
  subject: string;
  text: string;
}

export async function sendEmailWithResend(
  apiKey: string,
  payload: ResendEmailPayload,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: payload.from,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      text: payload.text,
      reply_to: payload.replyTo,
    }),
  });

  if (response.ok) {
    return;
  }

  const contentType = response.headers.get("content-type");
  let errorMessage: string | undefined;

  if (contentType?.includes("application/json")) {
    try {
      const body = (await response.json()) as { message?: string };
      errorMessage = body.message;
    } catch (error) {
      console.warn("Failed to parse Resend error response", error);
    }
  } else {
    errorMessage = await response.text();
  }

  const baseMessage = `Resend request failed with status ${response.status}`;
  throw new Error(errorMessage ? `${baseMessage}: ${errorMessage}` : baseMessage);
}
