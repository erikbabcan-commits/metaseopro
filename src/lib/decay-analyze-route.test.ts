import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/api/decay-analyze";
import { saveDecaySnapshot } from "./snapshots.server";

vi.mock("./api-auth.server", () => ({
  requireUser: async () => ({ ok: true, userId: "fixture-user" }),
}));
vi.mock("./snapshots.server", () => ({ saveDecaySnapshot: vi.fn(async () => "snapshot") }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: () =>
          table === "subscriptions"
            ? { maybeSingle: async () => ({ data: null }) }
            : Promise.resolve({ data: [] }),
      }),
    }),
  },
}));

type Post = (args: { request: Request }) => Promise<Response>;
const post = (Route.options as unknown as { server: { handlers: { POST: Post } } }).server.handlers
  .POST;
const site = "https://example.test/";
const payload = JSON.stringify({ mode: "live", scenario: "blog", siteUrl: site });
function send(body: string, headers?: HeadersInit) {
  return post({
    request: new Request("https://example.test/api/decay-analyze", {
      method: "POST",
      body,
      headers,
    }),
  });
}

describe("Decay Radar request boundaries", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_USER_IDS", "");
    vi.stubEnv("USER_GSC_SITES_fixture-user", site);
    vi.stubEnv("LOVABLE_API_KEY", "fixture");
    vi.stubEnv("GOOGLE_SEARCH_CONSOLE_API_KEY", "fixture");
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it.each([{}, { "content-length": "1" }])(
    "limits actual UTF-8 bytes before GSC access",
    async (headers) => {
      const body = JSON.stringify({ scenario: "blog", padding: "ž".repeat(4100) });
      expect((await send(body, headers as HeadersInit)).status).toBe(413);
      expect(fetch).not.toHaveBeenCalled();
      expect(saveDecaySnapshot).not.toHaveBeenCalled();
    },
  );
  it("accepts a demo at exactly 8192 bytes and rejects malformed JSON", async () => {
    expect((await send('{"scenario":"blog"}'.padEnd(8192))).status).toBe(200);
    expect((await send("{")).status).toBe(400);
    expect(saveDecaySnapshot).not.toHaveBeenCalled();
  });
  it("denies a foreign tenant locally", async () => {
    vi.stubEnv("USER_GSC_SITES_fixture-user", "https://other.test/");
    expect((await send(payload)).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
    expect(saveDecaySnapshot).not.toHaveBeenCalled();
  });
  it.each([undefined, "siteUnverifiedUser", "unknown"])(
    "denies unverified upstream permission %s",
    async (permissionLevel) => {
      vi.mocked(fetch).mockResolvedValueOnce(
        Response.json({ siteEntry: [{ siteUrl: site, permissionLevel }] }),
      );
      expect((await send(payload)).status).toBe(403);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(saveDecaySnapshot).not.toHaveBeenCalled();
    },
  );
  it("verifies a permitted site once before reading both windows and saving", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        Response.json({ siteEntry: [{ siteUrl: site, permissionLevel: "siteRestrictedUser" }] }),
      )
      .mockResolvedValueOnce(Response.json({ rows: [] }))
      .mockResolvedValueOnce(Response.json({ rows: [] }));
    const res = await send(payload);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      dataset: { demo: false, siteUrl: site },
      snapshotId: "snapshot",
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(saveDecaySnapshot).toHaveBeenCalledTimes(1);
  });
});
