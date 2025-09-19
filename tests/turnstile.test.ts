import { afterAll, describe, expect, it } from "vitest";

import { verifyTurnstileToken } from "../lib/turnstile.js";

type FetchResponder = Response | ((...args: Parameters<typeof fetch>) => Response | Promise<Response>);

function createFetchMock(responder: FetchResponder) {
  const calls: Parameters<typeof fetch>[] = [];

  const fn: typeof fetch = async (...args) => {
    calls.push(args);
    if (typeof responder === "function") {
      return await responder(...args);
    }

    return responder;
  };

  return { fn, calls };
}

describe("verifyTurnstileToken", () => {
  const originalSecret = process.env.TURNSTILE_SECRET_KEY;

  afterAll(() => {
    process.env.TURNSTILE_SECRET_KEY = originalSecret;
  });

  it("returns false when token is missing", async () => {
    const result = await verifyTurnstileToken("");
    expect(result).toBe(false);
  });

  it("verifies token with remote IP", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    const responder = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const fetchMock = createFetchMock(responder);

    const result = await verifyTurnstileToken("token-123", { remoteIp: "203.0.113.5" }, fetchMock.fn);

    expect(result).toBe(true);
    expect(fetchMock.calls).toHaveLength(1);
    expect(fetchMock.calls[0]?.[0]).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");

    const requestInit = fetchMock.calls[0]?.[1];
    const body = requestInit?.body as URLSearchParams | undefined;
    const bodyString = body?.toString() ?? "";
    expect(bodyString).toContain("secret=test-secret");
    expect(bodyString).toContain("response=token-123");
    expect(bodyString).toContain("remoteip=203.0.113.5");
  });

  it("returns false when Turnstile responds with failure", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    const responder = new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const fetchMock = createFetchMock(responder);

    const result = await verifyTurnstileToken("token-456", {}, fetchMock.fn);
    expect(result).toBe(false);
  });

  it("throws when response is not ok", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    const responder = new Response(null, { status: 500 });
    const fetchMock = createFetchMock(responder);

    await expect(verifyTurnstileToken("token", {}, fetchMock.fn))
      .rejects.toThrowError("Turnstile verification failed with status 500");
  });

  it("throws when secret key is missing", async () => {
    process.env.TURNSTILE_SECRET_KEY = "";
    await expect(verifyTurnstileToken("token"))
      .rejects.toThrowError("TURNSTILE_SECRET_KEY is not configured");
  });
});
