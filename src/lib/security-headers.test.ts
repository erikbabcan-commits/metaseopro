import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type HeaderRule = { source: string; headers: Array<{ key: string; value: string }> };
const vercel = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
  rewrites?: unknown[];
  headers?: HeaderRule[];
};

function headersFor(source: string): Record<string, string> {
  const rule = vercel.headers?.find((r) => r.source === source);
  return Object.fromEntries((rule?.headers ?? []).map((h) => [h.key.toLowerCase(), h.value]));
}

describe("vercel.json security headers", () => {
  const h = headersFor("/(.*)");

  it("applies to every path", () => {
    expect(Object.keys(h).length).toBeGreaterThan(0);
  });

  it("blocks framing and MIME sniffing and sets a referrer policy", () => {
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
  });

  it("enforces only non-breaking CSP directives", () => {
    const enforced = h["content-security-policy"];
    expect(enforced).toContain("frame-ancestors 'none'");
    expect(enforced).toContain("object-src 'none'");
    expect(enforced).toContain("base-uri 'self'");
    // script/connect restrictions stay report-only until verified in production
    expect(enforced).not.toMatch(/script-src|connect-src|default-src/);
  });

  it("ships the full policy as Report-Only and allows Supabase + Google Fonts", () => {
    const ro = h["content-security-policy-report-only"];
    expect(ro).toContain("default-src 'self'");
    expect(ro).toContain(
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com",
    );
    expect(ro).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(ro).toContain("font-src 'self' data: https://fonts.gstatic.com");
    // ignored (and logged as a console error) in a Report-Only policy
    expect(ro).not.toContain("upgrade-insecure-requests");
  });

  it("keeps the existing rewrites untouched", () => {
    expect(vercel.rewrites).toEqual([
      { source: "/~oauth/:path*", destination: "https://seo4web.lovable.app/~oauth/:path*" },
      { source: "/sitemap.xml", destination: "/api/public/sitemap" },
      { source: "/api/public/sitemap.xml", destination: "/api/public/sitemap" },
    ]);
  });
});
