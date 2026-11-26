import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PageAnalysis } from "@/lib/raketa-schema";

const analyzeMock = vi.hoisted(() => ({ fn: vi.fn() }));

vi.mock("@/lib/api-auth.server", () => ({
  requireUser: async () => ({ ok: true, userId: "00000000-0000-4000-8000-00000000a0d1" }),
}));

vi.mock("@/lib/site-analyze.server", async (orig) => {
  const real = await orig<typeof import("@/lib/site-analyze.server")>();
  return { ...real, analyzePage: (url: string) => analyzeMock.fn(url) };
});

import {
  collectOnPageData,
  isSemrushConfigured,
  ONPAGE_MODE_NOTICE,
  prependSseText,
  sseDeltaEvent,
} from "@/lib/audit-onpage.server";
import { AnalyzeError } from "@/lib/site-analyze.server";
import { Route as AuditRoute } from "@/routes/api/audit-domains";

type PostHandler = (args: { request: Request }) => Promise<Response>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const auditPost = (AuditRoute.options as any).server.handlers.POST as PostHandler;

function page(url: string): PageAnalysis {
  return {
    url,
    ok: true,
    estimated: false,
    title: "Titulok",
    metaDescription: "Popis",
    h1: ["Nadpis"],
    h2: [],
    h3: [],
    ctas: ["Kontakt"],
    wordCount: 420,
    textSummary: "Text",
  };
}

function auditRequest(domains: string[]): Request {
  const body = JSON.stringify({ domains });
  return new Request("http://localhost/api/audit-domains", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": String(body.length) },
    body,
  });
}

function sseBody(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(sseDeltaEvent(text)));
      c.enqueue(enc.encode("data: [DONE]\n\n"));
      c.close();
    },
  });
}

describe("isSemrushConfigured", () => {
  it("is false for missing, empty or whitespace keys", () => {
    expect(isSemrushConfigured({})).toBe(false);
    expect(isSemrushConfigured({ SEMRUSH_API_KEY: "" })).toBe(false);
    expect(isSemrushConfigured({ SEMRUSH_API_KEY: "   " })).toBe(false);
    expect(isSemrushConfigured({ SEMRUSH_API_KEY: "k" })).toBe(true);
  });
});

describe("collectOnPageData", () => {
  it("fetches https://<domain>/ and keeps per-domain errors instead of throwing", async () => {
    const analyze = vi.fn(async (url: string) => {
      if (url.includes("down.sk"))
        throw new AnalyzeError("FETCH_FAILED", "Web sa nepodarilo načítať.");
      return page(url);
    });
    const res = await collectOnPageData(["ok.sk", "down.sk"], analyze);
    expect(analyze).toHaveBeenCalledWith("https://ok.sk/");
    expect(res[0]).toMatchObject({ domain: "ok.sk", ok: true });
    expect(res[1]).toEqual({
      domain: "down.sk",
      url: "https://down.sk/",
      ok: false,
      error: "Web sa nepodarilo načítať.",
    });
  });

  it("never leaks non-AnalyzeError messages", async () => {
    const res = await collectOnPageData(["x.sk"], async () => {
      throw new Error("internal secret detail");
    });
    expect(res[0]).toMatchObject({ ok: false });
    expect(JSON.stringify(res)).not.toContain("secret");
  });
});

describe("prependSseText", () => {
  it("emits the prefix as the first SSE delta, then the upstream bytes unchanged", async () => {
    const out = await new Response(prependSseText("NOTICE\n", sseBody("AI"))).text();
    expect(out.startsWith(sseDeltaEvent("NOTICE\n"))).toBe(true);
    expect(out).toContain(sseDeltaEvent("AI"));
    expect(out.trim().endsWith("data: [DONE]")).toBe(true);
  });
});

describe("/api/audit-domains without SEMRUSH_API_KEY", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("SEMRUSH_API_KEY", "");
    vi.stubEnv("MISTRAL_API_KEY", "test-mistral");
    analyzeMock.fn.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does not return 503; streams an on-page audit with the mode notice first", async () => {
    analyzeMock.fn.mockImplementation(async (url: string) => page(url));
    fetchMock.mockResolvedValue(new Response(sseBody("REPORT"), { status: 200 }));

    const res = await auditPost({ request: auditRequest(["priklad.sk"]) });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Audit-Source")).toBe("onpage");
    const text = await res.text();
    expect(text.indexOf(sseDeltaEvent(ONPAGE_MODE_NOTICE))).toBe(0);
    expect(text).toContain(sseDeltaEvent("REPORT"));

    expect(analyzeMock.fn).toHaveBeenCalledWith("https://priklad.sk/");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("api.mistral.ai");
    const sent = JSON.parse(init.body as string);
    expect(sent.messages[0].content).toContain("NEMÁŠ žiadne dáta o návštevnosti");
    expect(sent.messages[1].content).toContain("priklad.sk");
    expect(sent.messages[1].content).not.toContain("Semrush database");
  });

  it("returns a clear 502 (not 503) when no domain could be fetched, without calling AI", async () => {
    analyzeMock.fn.mockRejectedValue(
      new AnalyzeError("FETCH_FAILED", "Web sa nepodarilo načítať."),
    );
    const res = await auditPost({ request: auditRequest(["nedostupny.sk"]) });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("nedostupny.sk");
    expect(body.error).not.toContain("Semrush");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the explicit MISTRAL_API_KEY error and fetches nothing when AI is not configured", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "");
    const res = await auditPost({ request: auditRequest(["priklad.sk"]) });
    expect(res.status).toBe(500);
    expect(analyzeMock.fn).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
