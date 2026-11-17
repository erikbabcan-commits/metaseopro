import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const EMAIL = "klient.tajny@eshop-example.sk";
const OTHER_EMAIL = "cudzi.klient@other-example.sk";
const DROP = { rows: [{ url: "https://x.sk/p", clicksPrev: 100, clicksNow: 20 }] };

const state = vi.hoisted(() => ({
  auth: { ok: false } as { ok: boolean; userId?: string; email?: string },
  accessDenied: false,
  eq: [] as Array<[string, unknown]>,
  createClientCalls: 0,
}));

const snapshots = [
  {
    id: "1",
    user_id: "u1",
    site_url: "https://eshop.sk/",
    raw_data: DROP,
    created_at: "2026-01-02",
  },
  {
    id: "2",
    user_id: "u2",
    site_url: "https://cudzi.sk/",
    raw_data: DROP,
    created_at: "2026-01-01",
  },
];
const profiles = [
  { user_id: "u1", email: EMAIL },
  { user_id: "u2", email: OTHER_EMAIL },
];

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => {
    state.createClientCalls++;
    return {
      from(table: string) {
        const eq: Array<[string, unknown]> = [];
        const b: Record<string, unknown> = {};
        b.select = () => b;
        b.order = () => b;
        b.limit = () => b;
        b.in = () => b;
        b.eq = (k: string, v: unknown) => {
          eq.push([k, v]);
          state.eq.push([k, v]);
          return b;
        };
        b.then = (res: (v: unknown) => unknown) => {
          let rows = (table === "seo_snapshots" ? snapshots : profiles) as Array<
            Record<string, unknown>
          >;
          for (const [k, v] of eq) rows = rows.filter((r) => r[k] === v);
          return Promise.resolve({ data: rows, error: null }).then(res);
        };
        return b;
      },
    };
  },
}));
vi.mock("@/lib/api-auth.server", () => ({
  requireUser: async () =>
    state.auth.ok
      ? { ...state.auth, ok: true }
      : { ok: false, response: new Response("{}", { status: 401 }) },
}));
vi.mock("@/lib/gsc.server", () => ({
  assertUserPropertyAccess: async (userId: string, siteUrl: string) => {
    if (state.accessDenied || userId !== "u1")
      throw new Error("GSC_USER_UNAUTHORIZED_FOR_PROPERTY");
    return siteUrl;
  },
}));

import { Route } from "@/routes/api/public/cron-decay-alerts";

type Handler = (args: { request: Request }) => Promise<Response>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GET = (Route.options as any).server.handlers.GET as Handler;

let n = 0;
function req(headers: Record<string, string> = {}, query = ""): Request {
  // unique IP per request so the in-memory IP rate limit never interferes
  return new Request(`http://localhost/api/public/cron-decay-alerts${query}`, {
    headers: { "cf-connecting-ip": `10.0.0.${++n}`, ...headers },
  });
}

let logs: string[] = [];
const logText = () => logs.join("\n");

describe("/api/public/cron-decay-alerts authorization + log hygiene", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    state.auth = { ok: false };
    state.accessDenied = false;
    state.eq = [];
    state.createClientCalls = 0;
    process.env.SUPABASE_URL = "http://supabase.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
    process.env.CRON_SECRET = "cron-secret-test";
    delete process.env.RESEND_API_KEY;
    logs = [];
    for (const m of ["log", "info", "warn", "error", "debug"] as const)
      vi.spyOn(console, m).mockImplementation((...a: unknown[]) => {
        logs.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
      });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...saved };
  });

  it("anonymous caller (no secret, no JWT) is rejected with 401 and nothing is evaluated", async () => {
    const res = await GET({ request: req() });
    expect(res.status).toBe(401);
    expect(state.createClientCalls).toBe(0);
  });

  it("wrong secret and no valid JWT is rejected with 401", async () => {
    const res = await GET({ request: req({ "x-cron-secret": "nope" }) });
    expect(res.status).toBe(401);
    expect(state.createClientCalls).toBe(0);
  });

  it("when CRON_SECRET is unset a guessed empty secret does not grant the system run", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET({ request: req({ "x-cron-secret": "" }) });
    expect(res.status).toBe(401);
  });

  it("authenticated user on a foreign property: rejected, no alert sent, no e-mail in logs/response", async () => {
    state.auth = { ok: true, userId: "u1", email: "u1@test.sk" };
    state.accessDenied = true;
    const res = await GET({ request: req({ authorization: "Bearer user-jwt" }) });
    const text = await res.text();
    const body = JSON.parse(text);
    expect(body.alertsSent).toBe(0);
    expect(text).toContain("Not authorized for this property");
    expect(text).not.toContain(EMAIL);
    expect(logText()).not.toContain("Simulating alert");
    expect(logText()).not.toContain(EMAIL);
  });

  it("authenticated user is scoped to own snapshots; log + response contain no e-mail", async () => {
    state.auth = { ok: true, userId: "u1", email: "u1@test.sk" };
    const res = await GET({ request: req({ authorization: "Bearer user-jwt" }) });
    const text = await res.text();
    expect(state.eq).toContainEqual(["user_id", "u1"]);
    expect(JSON.parse(text).evaluated).toBe(1);
    expect(logText()).toContain("Simulating alert"); // mock path ran...
    for (const e of [EMAIL, OTHER_EMAIL]) {
      expect(text).not.toContain(e); // ...without leaking addresses
      expect(logText()).not.toContain(e);
    }
  });

  it("CRON_SECRET system run covers all users but logs/returns no e-mail", async () => {
    const res = await GET({ request: req({ authorization: "Bearer cron-secret-test" }) });
    const text = await res.text();
    expect(JSON.parse(text).evaluated).toBe(2);
    expect(state.eq).toHaveLength(0);
    for (const e of [EMAIL, OTHER_EMAIL]) {
      expect(text).not.toContain(e);
      expect(logText()).not.toContain(e);
    }
  });
});
