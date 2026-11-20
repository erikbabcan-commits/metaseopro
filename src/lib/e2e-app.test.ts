import { describe, expect, it } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:8080";

async function requireServer(): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
      redirect: "manual",
    });
    if (res.status >= 200 && res.status < 500) return;
    throw new Error(`HTTP ${res.status}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Live server not reachable at ${BASE_URL}. Route checks must not be skipped. ${detail}`,
    );
  }
}

describe("E2E Application Workflow & Route Integrity", () => {
  it("renders Landing Page (/) with complete SSR metadata and AppHeader", async () => {
    await requireServer();

    const res = await fetch(`${BASE_URL}/`);
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("SEO4WEB");
    expect(html).toContain("AI SEO Command Center");
    expect(html).toContain("Blog Writer");
    // Dropdown links mount on interaction; their destinations are checked below
    // and through the authenticated browser navigation check.
    expect(html).toContain("Agentúra");
  }, 15000);

  it("serves Whitelabel Agency Settings route (/settings/agency)", async () => {
    await requireServer();

    const res = await fetch(`${BASE_URL}/settings/agency`);
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain("Nastavenia agentúry");
    expect(html).toContain("Whitelabel");
    expect(html).toContain("Branding");
  }, 15000);

  it("serves all primary application routes with 200 OK", async () => {
    await requireServer();

    const routes = [
      "/dashboard",
      "/decay",
      "/raketa",
      "/audit",
      "/plan",
      "/brief",
      "/history",
      "/login",
    ];

    await Promise.all(
      routes.map(async (route) => {
        const res = await fetch(`${BASE_URL}${route}`);
        expect(res.status, `Expected route ${route} to return 200 OK`).toBe(200);
        const text = await res.text();
        expect(text.length).toBeGreaterThan(500);
        expect(text).toContain("SEO4WEB");
      }),
    );
  }, 20000);

  it("guards API routes against unauthorized access", async () => {
    await requireServer();

    // decay-analyze requires bearer token
    const resAnalyze = await fetch(`${BASE_URL}/api/decay-analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "demo", scenario: "blog" }),
    });
    // Expect 401 Unauthorized
    expect(resAnalyze.status).toBe(401);
    const jsonAnalyze = await resAnalyze.json();
    expect(jsonAnalyze.error).toContain("prihlásenie");

    // decay-gsc-properties handles GET and requires bearer token
    const resProperties = await fetch(`${BASE_URL}/api/decay-gsc-properties`, {
      method: "GET",
    });
    expect(resProperties.status).toBe(401);
    const jsonProperties = await resProperties.json();
    expect(jsonProperties.error).toContain("prihlásenie");
  });

  it("handles Stripe webhook endpoint securely", async () => {
    await requireServer();

    const resWebhook = await fetch(`${BASE_URL}/api/public/stripe-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "test.event" }),
    });

    // Unsigned body: 503 when Stripe is not configured (no fake 200),
    // 400 when it is configured but the signature is missing.
    expect([400, 503]).toContain(resWebhook.status);
    const json = (await resWebhook.json()) as { error?: string };
    expect(json.error).toBe(
      resWebhook.status === 503 ? "BILLING_WEBHOOK_NOT_CONFIGURED" : "MISSING_STRIPE_SIGNATURE",
    );
  });
});
