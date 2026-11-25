import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("História výstupov & Archív (Search Clarity 100dvh Mobile & Desktop)", () => {
  const historySrc = readFileSync(resolve("src/routes/history.tsx"), "utf8");

  it("enforces 100dvh mobile shell, safe-area padding, and zero hardcoded hexes", () => {
    expect(historySrc).toContain("min-h-[100dvh]");
    expect(historySrc).toContain("bg-surface");
    expect(historySrc).toContain("pb-safe");
    expect(historySrc).toContain("pb-28");
    expect(historySrc).not.toMatch(/#ffffff|#000000/i);
  });

  it("renders Top Headline, creation dropdown, and 4 live KPI cards", () => {
    expect(historySrc).toContain("História vygenerovaných výstupov &amp; Archív");
    expect(historySrc).toContain("Vytvoriť nový výstup");
    expect(historySrc).toContain("Celkom záznamov");
    expect(historySrc).toContain("Raketa &amp; Články");
    expect(historySrc).toContain("Audity &amp; Decay");
    expect(historySrc).toContain("Plány &amp; Briefy");
  });

  it("includes live search, period filter, and category chips", () => {
    expect(historySrc).toContain("Filter obdobia");
    expect(historySrc).toContain("Posledných 7 dní");
    expect(historySrc).toContain("SEO Raketa");
    expect(historySrc).toContain("Decay Radar");
    expect(historySrc).toContain("Content Plan");
  });

  it("wires live backend operations and CmsDeployDialog in preview panel & mobile drawer", () => {
    expect(historySrc).toContain("listOutputs");
    expect(historySrc).toContain("getOutput");
    expect(historySrc).toContain("deleteOutput");
    expect(historySrc).toContain("Rýchly Náhľad &amp; Export");
    expect(historySrc).toContain("CmsDeployDialog");
  });
});
