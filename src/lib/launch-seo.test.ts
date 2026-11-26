import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { faqData } from "@/components/landing/faq-data";
import { buildLandingJsonLd, serializeJsonLd } from "@/lib/landing-jsonld";

const read = (rel: string) => readFileSync(resolve(rel), "utf8");
const PRIVATE_ROUTES = ["/audit", "/plan", "/brief", "/raketa", "/decay"];

describe("public/sitemap.xml", () => {
  const xml = read("public/sitemap.xml");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  it("is a urlset with absolute https://seo.vorkei.com URLs", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) expect(loc.startsWith("https://seo.vorkei.com/")).toBe(true);
    expect(locs).toContain("https://seo.vorkei.com/");
  });

  it("lists no login-only routes", () => {
    for (const route of PRIVATE_ROUTES) {
      expect(locs.some((l) => l.endsWith(route))).toBe(false);
      expect(read("src/routes/api/public/sitemap.ts")).not.toContain(`path: "${route}"`);
    }
  });

  it("is the only Sitemap line in robots.txt", () => {
    const lines = read("public/robots.txt")
      .split("\n")
      .filter((l) => l.startsWith("Sitemap:"));
    expect(lines).toEqual(["Sitemap: https://seo.vorkei.com/sitemap.xml"]);
  });
});

describe("landing JSON-LD", () => {
  const nodes = buildLandingJsonLd();

  it("emits Organization, SoftwareApplication and FAQPage that survive JSON.parse", () => {
    expect(nodes.map((n) => n["@type"])).toEqual([
      "Organization",
      "SoftwareApplication",
      "FAQPage",
    ]);
    for (const n of nodes) expect(JSON.parse(serializeJsonLd(n))).toEqual(n);
  });

  it("FAQPage mirrors the visible FAQ 1:1", () => {
    const faq = nodes.find((n) => n["@type"] === "FAQPage") as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(faq.mainEntity).toHaveLength(faqData.length);
    faqData.forEach((item, i) => {
      expect(faq.mainEntity[i].name).toBe(item.question);
      expect(faq.mainEntity[i].acceptedAnswer.text).toBe(item.answer);
    });
  });

  it("has no invented offers, prices or ratings", () => {
    const text = JSON.stringify(nodes);
    expect(text).not.toMatch(/offers|aggregateRating|review|price/i);
  });

  it("escapes </script> breakouts", () => {
    expect(serializeJsonLd({ a: "</script><b>" })).not.toContain("</script>");
  });
});

describe("root head meta", () => {
  const root = read("src/routes/__root.tsx");

  it("has a Slovak twitter:description equal to og:description", () => {
    const og = root.match(/property: "og:description",\s*content:\s*"([^"]+)"/)?.[1];
    const tw = root.match(/name: "twitter:description",\s*content:\s*"([^"]+)"/)?.[1];
    expect(tw).toBeTruthy();
    expect(tw).toBe(og);
  });

  it("has a dedicated title for the not-found page", () => {
    expect(root).toContain('"Stránka nenájdená — SEO4WEB"');
  });
});
