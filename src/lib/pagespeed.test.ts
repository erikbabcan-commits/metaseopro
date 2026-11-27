import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearPageSpeedCache,
  fetchPageSpeedReport,
  normalizePageSpeedUrl,
} from "./pagespeed.server";

describe("pagespeed.server", () => {
  const originalKey = process.env.PAGESPEED_API_KEY;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    process.env.PAGESPEED_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
    clearPageSpeedCache();
    vi.restoreAllMocks();
  });

  it("normalizes bare domains to https and rejects private hosts", () => {
    expect(normalizePageSpeedUrl("seo.vorkei.com")).toBe("https://seo.vorkei.com/");
    expect(() => normalizePageSpeedUrl("http://localhost:3000")).toThrow(
      "Interné alebo neplatné domény",
    );
    expect(() => normalizePageSpeedUrl("http://127.0.0.1/test")).toThrow(
      "Interné alebo neplatné domény",
    );
    expect(() => normalizePageSpeedUrl("ftp://seo.vorkei.com")).toThrow("Povolené sú len");
  });

  it("parses Lighthouse scores, CWV metrics, opportunities and caches results", async () => {
    delete process.env.PAGESPEED_API_KEY;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        lighthouseResult: {
          finalUrl: "https://seo.vorkei.com/",
          categories: {
            performance: { score: 0.94 },
            seo: { score: 1 },
            accessibility: { score: 0.91 },
            "best-practices": { score: 0.96 },
          },
          audits: {
            "largest-contentful-paint": {
              numericValue: 1420,
              displayValue: "1.4 s",
              score: 0.95,
            },
            "cumulative-layout-shift": {
              numericValue: 0.02,
              displayValue: "0.02",
              score: 1,
            },
            "first-contentful-paint": {
              numericValue: 820,
              displayValue: "0.8 s",
              score: 0.98,
            },
            "total-blocking-time": {
              numericValue: 90,
              displayValue: "90 ms",
              score: 0.97,
            },
            "server-response-time": {
              numericValue: 180,
              displayValue: "Root document took 180 ms",
              score: 0.99,
            },
            "unused-javascript": {
              title: "Reduce unused JavaScript",
              displayValue: "Potential savings of 250 ms",
              details: { type: "opportunity", overallSavingsMs: 250 },
            },
          },
        },
      }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const first = await fetchPageSpeedReport("seo.vorkei.com", "mobile");
    expect(first.cached).toBe(false);
    expect(first.scores).toEqual({
      performance: 94,
      seo: 100,
      accessibility: 91,
      bestPractices: 96,
    });
    expect(first.metrics.lcp.displayValue).toBe("1.4 s");
    expect(first.metrics.cls.displayValue).toBe("0.02");
    expect(first.opportunities[0]?.title).toBe("Reduce unused JavaScript");

    const second = await fetchPageSpeedReport("https://seo.vorkei.com/", "mobile");
    expect(second.cached).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("appends PAGESPEED_API_KEY when configured", async () => {
    process.env.PAGESPEED_API_KEY = "ps-secret-key";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lighthouseResult: { categories: {}, audits: {} } }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await fetchPageSpeedReport("seo.vorkei.com", "desktop");
    const calledUrl = String(mockFetch.mock.calls[0]?.[0] ?? "");
    expect(calledUrl).toContain("strategy=desktop");
    expect(calledUrl).toContain("key=ps-secret-key");
  });
});
