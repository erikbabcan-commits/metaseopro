import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("SEO Audit (/audit) Search Clarity Design System & 100dvh Layout", () => {
  const auditPath = resolve("src/routes/audit.tsx");
  const source = readFileSync(auditPath, "utf-8");

  it("enforces 100dvh root wrapper with background token and proper text colors", () => {
    expect(source).toContain("min-h-[100dvh]");
    expect(source).toContain("bg-background");
    expect(source).toContain("text-on-surface");
    expect(source).toContain("pb-28 md:pb-16");
  });

  it("uses Google Search Clarity tokens and eliminates raw shadcn muted styles", () => {
    expect(source).toContain("bg-surface-pure");
    expect(source).toContain("border-border-subtle");
    expect(source).toContain("text-text-primary");
    expect(source).toContain("text-text-secondary");
    expect(source).toContain("bg-primary-container");
    expect(source).not.toContain("bg-muted/50");
  });

  it("does not render hard-coded score, traffic or Core Web Vitals numbers", () => {
    for (const fake of [
      "Zdravie webu & SEO Skóre",
      "showOutput ? 74 : 0",
      "~850 návštev",
      "~510 € / mes.",
      "LCP (Rýchlosť)",
      "Semrush Live Matrix",
    ]) {
      expect(source).not.toContain(fake);
    }
  });

  it("provides 1-click CTA to SEO Raketa", () => {
    expect(source).toContain('to="/raketa"');
    expect(source).toContain("Spustiť SEO Raketu");
  });

  it("features a mobile-first sticky action bar with safe area inset support", () => {
    expect(source).toContain("calc(1.5rem + env(safe-area-inset-bottom, 0px))");
    expect(source).toContain("Stiahnuť .md");
    expect(source).toContain("Kopírovať");
  });
});
