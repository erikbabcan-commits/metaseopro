import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanStatusAccessError, resolvePlanStatusTarget, toPlanStatus } from "./plan-status.server";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const ADMIN = "33333333-3333-4333-8333-333333333333";
const FUTURE = "2099-01-01T00:00:00.000Z";

type Call = { client: "user" | "admin"; table: string; filters: Array<[string, unknown]> };

const mocks = vi.hoisted(() => {
  const state = {
    sessionUserId: null as string | null,
    calls: [] as Call[],
    rows: new Map<string, Record<string, unknown>>(),
  };
  function client(kind: "user" | "admin") {
    return {
      from(table: string) {
        const call: Call = { client: kind, table, filters: [] };
        const query = {
          select() {
            return query;
          },
          eq(column: string, value: unknown) {
            call.filters.push([column, value]);
            return query;
          },
          async maybeSingle() {
            state.calls.push(call);
            const userId = call.filters.find(([c]) => c === "user_id")?.[1] as string;
            // Model RLS for the user-scoped client: only the session user's row is visible.
            if (kind === "user" && userId !== state.sessionUserId) {
              return { data: null, error: null };
            }
            return { data: state.rows.get(userId) ?? null, error: null };
          },
        };
        return query;
      },
    };
  }
  const user = client("user");
  const admin = client("admin");
  const requireSupabaseAuth = {
    authorize: async () => {
      if (!state.sessionUserId) throw new Error("Unauthorized: No authorization header provided");
      return { userId: state.sessionUserId, supabase: user };
    },
  };
  return { state, user, admin, requireSupabaseAuth };
});

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (data: unknown) => data;
    let middleware: unknown[] = [];
    const builder = {
      middleware(items: unknown[]) {
        middleware = items;
        return builder;
      },
      validator(fn: (data: unknown) => unknown) {
        validate = fn;
        return builder;
      },
      handler(_rpc: unknown, fn: (args: { data: unknown; context: unknown }) => Promise<unknown>) {
        return {
          __executeServer: async (args: { data?: unknown } = {}) => {
            if (!middleware.includes(mocks.requireSupabaseAuth)) {
              throw new Error("Missing auth middleware on provider handler");
            }
            const context = await mocks.requireSupabaseAuth.authorize();
            return fn({ data: validate(args.data), context });
          },
        };
      },
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: mocks.requireSupabaseAuth,
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: mocks.admin }));

import type * as PlanStatusFunctions from "./plan-status.functions";
// @ts-expect-error TanStack's Vite compiler supplies this provider module and its generated exports.
import * as provider from "./plan-status.functions?tss-serverfn-split";

const getPlanStatus = provider.getPlanStatus_createServerFn_handler as unknown as (args?: {
  data?: unknown;
}) => ReturnType<typeof PlanStatusFunctions.getPlanStatus>;

const ENV_KEYS = ["ADMIN_USER_IDS", "ADMIN_EMAILS"] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  mocks.state.sessionUserId = null;
  mocks.state.calls = [];
  mocks.state.rows = new Map([
    [USER_A, { plan: "pro", status: "active", current_period_end: FUTURE }],
    [USER_B, { plan: "agency", status: "active", current_period_end: FUTURE }],
  ]);
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("resolvePlanStatusTarget", () => {
  it("rejects a missing session with 401", () => {
    for (const session of [null, undefined, ""]) {
      const err = (() => {
        try {
          resolvePlanStatusTarget(session, USER_B);
        } catch (e) {
          return e;
        }
      })();
      expect(err).toBeInstanceOf(PlanStatusAccessError);
      expect((err as PlanStatusAccessError).status).toBe(401);
      expect((err as PlanStatusAccessError).code).toBe("UNAUTHORIZED");
    }
  });

  it("returns the session user when no or the same id is requested", () => {
    expect(resolvePlanStatusTarget(USER_A)).toBe(USER_A);
    expect(resolvePlanStatusTarget(USER_A, null)).toBe(USER_A);
    expect(resolvePlanStatusTarget(USER_A, USER_A)).toBe(USER_A);
  });

  it("rejects another user's id with 403 for a normal user", () => {
    expect(() => resolvePlanStatusTarget(USER_A, USER_B)).toThrowError(
      expect.objectContaining({ status: 403, code: "FORBIDDEN" }),
    );
  });

  it("rejects when ADMIN_USER_IDS is empty, blank or lists someone else", () => {
    for (const value of [undefined, "", " , ", USER_B]) {
      if (value === undefined) delete process.env.ADMIN_USER_IDS;
      else process.env.ADMIN_USER_IDS = value;
      expect(() => resolvePlanStatusTarget(USER_A, USER_B)).toThrowError(PlanStatusAccessError);
    }
  });

  it("never grants cross-user reads through the ADMIN_EMAILS fallback", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(() => resolvePlanStatusTarget(USER_A, USER_B)).toThrowError(PlanStatusAccessError);
  });

  it("allows an ID-based superadmin to read another user's plan", () => {
    process.env.ADMIN_USER_IDS = ` ${ADMIN} , ${USER_B}`;
    expect(resolvePlanStatusTarget(ADMIN, USER_B)).toBe(USER_B);
  });

  it("derives hasAgencyPlan only from a current agency entitlement", () => {
    expect(toPlanStatus(USER_A, null)).toEqual({
      userId: USER_A,
      plan: "free",
      hasAgencyPlan: false,
    });
    expect(
      toPlanStatus(USER_A, { plan: "agency", status: "active", current_period_end: FUTURE }),
    ).toEqual({ userId: USER_A, plan: "agency", hasAgencyPlan: true });
    expect(
      toPlanStatus(USER_A, { plan: "agency", status: "canceled", current_period_end: FUTURE })
        .hasAgencyPlan,
    ).toBe(false);
  });
});

describe("getPlanStatus server function", () => {
  it("rejects unauthenticated callers before the handler runs", async () => {
    await expect(getPlanStatus({})).rejects.toThrow(/Unauthorized/);
    expect(mocks.state.calls).toEqual([]);
  });

  it("returns only the session user's own plan", async () => {
    mocks.state.sessionUserId = USER_A;
    await expect(getPlanStatus({})).resolves.toEqual({
      userId: USER_A,
      plan: "pro",
      hasAgencyPlan: false,
    });
    expect(mocks.state.calls).toEqual([
      { client: "user", table: "subscriptions", filters: [["user_id", USER_A]] },
    ]);
  });

  it("user A cannot read user B's plan by passing B's id", async () => {
    mocks.state.sessionUserId = USER_A;
    await expect(getPlanStatus({ data: { userId: USER_B } })).rejects.toThrow(
      "PLAN_STATUS_FORBIDDEN",
    );
    expect(mocks.state.calls).toEqual([]);
  });

  it("rejects spoofed identity fields and unknown keys (mass assignment)", async () => {
    mocks.state.sessionUserId = USER_A;
    for (const data of [
      { user_id: USER_B },
      { userId: USER_A, isAdmin: true },
      { userId: USER_B, role: "admin" },
      { userId: "not-a-uuid" },
    ]) {
      await expect(getPlanStatus({ data })).rejects.toThrow();
    }
    expect(mocks.state.calls).toEqual([]);
  });

  it("does not treat a client-provided admin flag or ADMIN_EMAILS as superadmin", async () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    mocks.state.sessionUserId = USER_A;
    await expect(getPlanStatus({ data: { userId: USER_B } })).rejects.toThrow(
      "PLAN_STATUS_FORBIDDEN",
    );
    expect(mocks.state.calls).toEqual([]);
  });

  it("lets an ID-based superadmin read another user's plan via the server client", async () => {
    process.env.ADMIN_USER_IDS = ADMIN;
    mocks.state.sessionUserId = ADMIN;
    await expect(getPlanStatus({ data: { userId: USER_B } })).resolves.toEqual({
      userId: USER_B,
      plan: "agency",
      hasAgencyPlan: true,
    });
    expect(mocks.state.calls).toEqual([
      { client: "admin", table: "subscriptions", filters: [["user_id", USER_B]] },
    ]);
  });

  it("fails closed with a typed error when the lookup fails", async () => {
    mocks.state.sessionUserId = USER_A;
    const spy = vi.spyOn(mocks.user, "from").mockImplementationOnce(() => {
      throw new Error("SYNTHETIC_PRIVATE_DATABASE_DETAIL");
    });
    await expect(getPlanStatus({})).rejects.toThrow("PLAN_STATUS_UNAVAILABLE");
    spy.mockRestore();
  });
});

describe("subscriptions RLS (real PostgreSQL in WASM)", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await PGlite.create();
    await db.exec(`
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid;
      $$;
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
      CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN NEW.updated_at=now(); RETURN NEW; END;
      $$;
    `);
    await db.query("INSERT INTO auth.users(id) VALUES ($1),($2)", [USER_A, USER_B]);
    await db.exec(
      readFileSync(resolve("supabase/migrations/20261110231500_subscriptions.sql"), "utf8"),
    );
    await db.query(
      "INSERT INTO public.subscriptions(user_id,plan,status,current_period_end) VALUES ($1,'pro','active',$3),($2,'agency','active',$3)",
      [USER_A, USER_B, FUTURE],
    );
  }, 30_000);
  afterAll(async () => {
    await db?.close();
  });

  async function asUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    await db.exec("SET ROLE authenticated");
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [userId]);
    try {
      return await fn();
    } finally {
      await db.exec("RESET ROLE");
    }
  }

  it("user A sees only their own subscription row, never user B's", async () => {
    const own = await asUser(USER_A, () =>
      db.query<{ plan: string }>("SELECT plan FROM public.subscriptions WHERE user_id=$1", [
        USER_A,
      ]),
    );
    expect(own.rows).toEqual([{ plan: "pro" }]);
    const foreign = await asUser(USER_A, () =>
      db.query("SELECT plan FROM public.subscriptions WHERE user_id=$1", [USER_B]),
    );
    expect(foreign.rows).toEqual([]);
  });

  it("anon cannot read subscriptions", async () => {
    await db.exec("SET ROLE anon");
    try {
      await expect(db.query("SELECT plan FROM public.subscriptions")).rejects.toThrow();
    } finally {
      await db.exec("RESET ROLE");
    }
  });
});

describe("app code never asks the database for another user's plan", () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
  }

  it("does not call the has_agency_plan RPC with a client-chosen id", () => {
    const offenders = sourceFiles(resolve("src"))
      .filter((file) => !file.endsWith(join("integrations", "supabase", "types.ts")))
      .filter((file) => /\.rpc\(\s*["'`]has_agency_plan/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
