import { describe, expect, it } from "vitest";

import { sendEmailWithResend } from "../lib/resend.js";

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

describe("sendEmailWithResend", () => {
  it("sends a request with expected headers and body", async () => {
    const responder = new Response(null, { status: 200 });
    const fetchMock = createFetchMock(responder);

    await sendEmailWithResend(
      "api-key",
      {
        from: "Portfolio <hello@example.com>",
        to: "owner@example.com",
        replyTo: "sender@example.com",
        subject: "New contact",
        text: "Hello there",
      },
      fetchMock.fn,
    );

    expect(fetchMock.calls).toHaveLength(1);
    const [url, init] = fetchMock.calls[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer api-key",
      "Content-Type": "application/json",
    });

    const body = typeof init?.body === "string" ? init.body : undefined;
    expect(body).toBeDefined();

    const parsedBody = body ? (JSON.parse(body) as Record<string, unknown>) : {};
    expect(parsedBody).toMatchObject({
      from: "Portfolio <hello@example.com>",
      to: ["owner@example.com"],
      reply_to: "sender@example.com",
      subject: "New contact",
      text: "Hello there",
    });
  });

  it("throws with detailed message when API returns JSON error", async () => {
    const responder = new Response(JSON.stringify({ message: "domain not verified" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
    const fetchMock = createFetchMock(responder);

    await expect(
      sendEmailWithResend(
        "api-key",
        {
          from: "noreply@example.com",
          to: ["owner@example.com"],
          subject: "Subject",
          text: "Body",
        },
        fetchMock.fn,
      ),
    ).rejects.toThrowError(/domain not verified/);
  });

  it("throws with status when API returns non-JSON error", async () => {
    const responder = new Response("Service unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
    const fetchMock = createFetchMock(responder);

    await expect(
      sendEmailWithResend(
        "api-key",
        {
          from: "noreply@example.com",
          to: "owner@example.com",
          subject: "Subject",
          text: "Body",
        },
        fetchMock.fn,
      ),
    ).rejects.toThrowError("Resend request failed with status 503: Service unavailable");
  });
});
