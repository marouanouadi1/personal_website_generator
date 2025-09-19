export interface VerifyTurnstileTokenOptions {
  remoteIp?: string;
}

interface TurnstileSuccessResponse {
  success: true;
  challenge_ts: string;
  hostname: string;
}

interface TurnstileErrorResponse {
  success: false;
  "error-codes"?: string[];
}

type TurnstileResponse = TurnstileSuccessResponse | TurnstileErrorResponse;

const TURNSTILE_VERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string,
  options: VerifyTurnstileTokenOptions = {},
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (!token) {
    return false;
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("TURNSTILE_SECRET_KEY is not configured");
  }

  const params = new URLSearchParams({
    secret: secretKey,
    response: token,
  });

  if (options.remoteIp) {
    params.append("remoteip", options.remoteIp);
  }

  const response = await fetcher(TURNSTILE_VERIFY_ENDPOINT, {
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    throw new Error(`Turnstile verification failed with status ${response.status}`);
  }

  const payload = (await response.json()) as TurnstileResponse;

  if (!payload.success) {
    if ("error-codes" in payload && payload["error-codes"]?.length) {
      console.warn("Turnstile verification failed", payload["error-codes"]);
    }

    return false;
  }

  return true;
}
