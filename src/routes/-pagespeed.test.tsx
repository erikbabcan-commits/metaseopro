import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("PageSpeed Report Route (/pagespeed) & Navigation", () => {
  const pagespeedPath = resolve("src/routes/pagespeed.tsx");
  const pagespeedSource = readFileSync(pagespeedPath, "utf-8");

  const floatingNavPath = resolve("src/components/TactileFloatingNav.tsx");
  const floatingNavSource = readFileSync(floatingNavPath, "utf-8");

  it("pagespeed route defines Route for /pagespeed and SEO metadata", () => {
    expect(pagespeedSource).toContain('createFileRoute("/pagespeed")');
    expect(pagespeedSource).toContain("Executive PageSpeed & Core Web Vitals Report");
    expect(pagespeedSource).toContain("Oficiálny technický audit rýchlosti a Core Web Vitals");
  });

  it("pagespeed renders A4 canvas, Core Web Vitals scoreboard, and whitelabel switch", () => {
    expect(pagespeedSource).toContain(
      "Manažérske zhrnutie: Optimalizácia rýchlosti cez modul SEO Raketa",
    );
    expect(pagespeedSource).toContain("Porovnanie metrík: Pred vs. Po optimalizácii");
    expect(pagespeedSource).toContain("Lighthouse Performance");
    expect(pagespeedSource).toContain("LCP (Largest Contentful)");
    expect(pagespeedSource).toContain("INP (Interaction Next Paint)");
    expect(pagespeedSource).toContain("CLS (Layout Shift)");
    expect(pagespeedSource).toContain("TBT (Total Blocking Time)");
    expect(pagespeedSource).toContain("Prenos dát (Payload)");
    expect(pagespeedSource).toContain("Agentúrny whitelabel");
    expect(pagespeedSource).toContain("Stiahnuť PDF");
    expect(pagespeedSource).toContain("Zdieľať odkaz");
    expect(pagespeedSource).toContain("Zmerať cez PageSpeed API");
  });

  it("pagespeed includes technical actions and business impact blocks", () => {
    expect(pagespeedSource).toContain("Vykonané technické zásahy");
    expect(pagespeedSource).toContain("Generovanie kritického CSS inline");
    expect(pagespeedSource).toContain("Konverzia a servovanie grafiky v AVIF / WebP");
    expect(pagespeedSource).toContain("Biznisový &amp; SEO dopad");
    expect(pagespeedSource).toContain("Konverzie e-shopu");
    expect(pagespeedSource).toContain("+8.4%");
  });

  it("TactileFloatingNav links to /pagespeed in the tools drawer", () => {
    expect(floatingNavSource).toContain('to="/pagespeed"');
    expect(floatingNavSource).toContain("PageSpeed & Core Web Vitals");
  });
});
