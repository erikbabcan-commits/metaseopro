import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// If TEST_BASE_URL is set (e.g. CI starts its own dev server on :4173) that server is used as-is.
// Otherwise the suite targets 127.0.0.1:5180 and, when nothing is listening there,
// starts `vite dev` itself on that port and tears it down in afterAll.
const EXTERNAL_BASE_URL = process.env.TEST_BASE_URL;
const SELF_HOST = "127.0.0.1";
const SELF_PORT = 5180;
const BASE_URL = EXTERNAL_BASE_URL || `http://${SELF_HOST}:${SELF_PORT}`;

let devServer: ChildProcess | undefined;
let devServerLog = "";

async function isReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/`, {
      signal: AbortSignal.timeout(3000),
      redirect: "manual",
    });
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
}

async function startDevServerIfNeeded(): Promise<void> {
  if (EXTERNAL_BASE_URL) return; // caller owns the server; requireServer() reports if it is down
  if (await isReachable()) return; // reuse an already running server on :5180

  const viteBin = resolve(process.cwd(), "node_modules/vite/bin/vite.js");
  devServer = spawn(
    process.execPath,
    [viteBin, "dev", "--host", SELF_HOST, "--port", String(SELF_PORT), "--strictPort"],
    { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"], detached: true },
  );
  const collect = (chunk: Buffer) => {
    devServerLog = (devServerLog + chunk.toString()).slice(-4000);
  };
  devServer.stdout?.on("data", collect);
  devServer.stderr?.on("data", collect);
  let exited = false;
  devServer.on("exit", () => {
    exited = true;
  });

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (exited) break;
    if (await isReachable()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Could not start vite dev on ${BASE_URL}.\n${devServerLog}`);
}

function stopDevServer(): void {
  if (!devServer?.pid) return;
  try {
    // negative pid = whole process group created by detached spawn (only our own child tree)
    process.kill(-devServer.pid, "SIGTERM");
  } catch {
    devServer.kill("SIGTERM");
  }
  devServer = undefined;
}

beforeAll(async () => {
  await startDevServerIfNeeded();
}, 120_000);

afterAll(() => {
  stopDevServer();
});

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
    expect(html).toContain("AI Writer");
    expect(html).toContain("Nástroje");
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
