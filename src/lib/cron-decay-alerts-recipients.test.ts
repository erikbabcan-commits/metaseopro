// Wiring test for the decay-alert cron route: who actually receives an e-mail.
// Recipients must be the confirmed auth e-mail; unconfirmed / missing / failed
// lookups are skipped, and public.profiles (user-editable) is never read.
// NOTE: when #21 moves the sweep into a library function this test must keep
// covering the same behaviour through the new call path.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AuthUser = { email?: string | null; email_confirmed_at?: string | null } | Error | null;

const mocks = vi.hoisted(() => {
  const state = {
    snapshots: [] as Array<Record<string, unknown>>,
    users: {} as Record<string, unknown>,
    tablesRead: [] as string[],
  };
  const sendDecayAlertEmail = vi.fn(async (_p: { toEmail: string }) => ({
    ok: true,
    simulated: false,
  }));
  const client = {
    from(table: string) {
      state.tablesRead.push(table);
      const rows =
        table === "seo_snapshots"
          ? state.snapshots
          : // What a user could plant through RLS: must never be used as a recipient.
            [{ id: "u-unconf", email: "profile-edit@attacker.example" }];
      const q = {
        select: () => q,
        order: () => q,
        limit: () => q,
        eq: () => q,
        in: () => q,
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: rows, error: null }).then(resolve),
      };
      return q;
    },
    auth: {
      admin: {
        getUserById: async (id: string) => {
          const u = state.users[id] as AuthUser | undefined;
          if (u instanceof Error) throw u;
          if (!u) return { data: { user: null }, error: { message: "not found" } };
          return { data: { user: u }, error: null };
        },
      },
    },
  };
  return { state, sendDecayAlertEmail, createClient: vi.fn(() => client) };
});

vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/decay-alerts.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./decay-alerts.server")>()),
  sendDecayAlertEmail: mocks.sendDecayAlertEmail,
}));

import { Route } from "@/routes/api/public/cron-decay-alerts";

type Handler = (args: { request: Request }) => Promise<Response>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const get = (Route.options as any).server.handlers.GET as Handler;

const SECRET = "cron-secret-fixture";
let ipSeq = 0;
const call = () =>
  get({
    request: new Request("http://localhost/api/public/cron-decay-alerts", {
      headers: { authorization: `Bearer ${SECRET}`, "x-forwarded-for": `10.9.0.${++ipSeq}` },
    }),
  });

const snapshot = (userId: string) => ({
  id: `snap-${userId}`,
  user_id: userId,
  site_url: `https://${userId}.example`,
  metrics_summary: {},
  created_at: "2026-11-18T00:00:00Z",
  raw_data: { rows: [{ url: `https://${userId}.example/a`, clicksPrev: 100, clicksNow: 10 }] },
});

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.stubEnv("SUPABASE_URL", "https://supabase.example");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-fixture");
  mocks.state.tablesRead = [];
  mocks.sendDecayAlertEmail.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("cron-decay-alerts recipient selection", () => {
  it("e-mails only the confirmed auth address and never reads profiles", async () => {
    mocks.state.snapshots = ["u-conf", "u-unconf", "u-noemail", "u-missing", "u-err"].map(snapshot);
    mocks.state.users = {
      "u-conf": { email: "owner@example.com", email_confirmed_at: "2026-01-01T00:00:00Z" },
      "u-unconf": { email: "unconfirmed@example.com", email_confirmed_at: null },
      "u-noemail": { email: null, email_confirmed_at: "2026-01-01T00:00:00Z" },
      "u-err": new Error("auth api down"),
    };

    const res = await call();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { alertsSent: number; evaluated: number };
    expect(body.evaluated).toBe(5);
    expect(body.alertsSent).toBe(1);

    expect(mocks.sendDecayAlertEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendDecayAlertEmail.mock.calls[0]![0].toEmail).toBe("owner@example.com");
    const recipients = mocks.sendDecayAlertEmail.mock.calls.map((c) => c[0].toEmail);
    expect(recipients).not.toContain("unconfirmed@example.com");
    expect(recipients).not.toContain("profile-edit@attacker.example");
    expect(mocks.state.tablesRead).not.toContain("profiles");
  });

  it("sends nothing when no user has a confirmed e-mail", async () => {
    mocks.state.snapshots = [snapshot("u-unconf")];
    mocks.state.users = {
      "u-unconf": { email: "unconfirmed@example.com", email_confirmed_at: null },
    };
    const res = await call();
    expect(res.status).toBe(200);
    expect(mocks.sendDecayAlertEmail).not.toHaveBeenCalled();
    expect(mocks.state.tablesRead).not.toContain("profiles");
  });

  it("rejects a request without the cron secret before touching any data", async () => {
    const res = await get({
      request: new Request("http://localhost/api/public/cron-decay-alerts", {
        headers: { "x-forwarded-for": `10.9.1.${++ipSeq}` },
      }),
    });
    expect(res.status).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.sendDecayAlertEmail).not.toHaveBeenCalled();
  });
});
