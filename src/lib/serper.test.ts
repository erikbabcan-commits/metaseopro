import { afterEach, describe, expect, it, vi } from "vitest";
import { searchSerper } from "./serper.server";

describe("searchSerper", () => {
  const originalKey = process.env.SERPER_API_KEY;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    process.env.SERPER_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("throws when SERPER_API_KEY is missing", async () => {
    delete process.env.SERPER_API_KEY;
    await expect(searchSerper("seo4web")).rejects.toThrow("SERPER_API_KEY is not configured");
  });

  it("throws when query is empty", async () => {
    process.env.SERPER_API_KEY = "test-key";
    await expect(searchSerper("   ")).rejects.toThrow("Search query must not be empty");
  });

  it("calls Serper API with X-API-KEY and sk defaults", async () => {
    process.env.SERPER_API_KEY = "test-key";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ organic: [{ title: "Test", link: "https://seo.vorkei.com" }] }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const res = await searchSerper("seo4web");
    expect(res.organic?.[0]?.link).toBe("https://seo.vorkei.com");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://google.serper.dev/search",
      expect.objectContaining({
        method: "POST",
        headers: {
          "X-API-KEY": "test-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: "seo4web", gl: "sk", hl: "sk", num: 10 }),
      }),
    );
  });

  it("automatically resolves google.com/goto?url= links via /resolve", async () => {
    process.env.SERPER_API_KEY = "test-key";
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          organic: [{ title: "Redirected", link: "https://www.google.com/goto?url=CAES123" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          organic: [{ title: "Redirected", link: "https://seo.vorkei.com" }],
        }),
      });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const res = await searchSerper("seo4web");
    expect(res.organic?.[0]?.link).toBe("https://seo.vorkei.com");
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "https://google.serper.dev/resolve",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
