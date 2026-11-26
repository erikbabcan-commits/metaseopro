import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("SerpLab Sandbox (/serplab) & Whitelabel Hub (/settings/agency) Desktop UI", () => {
  const serplabPath = resolve("src/routes/serplab.tsx");
  const serplabSource = readFileSync(serplabPath, "utf-8");

  const agencyPath = resolve("src/routes/settings.agency.tsx");
  const agencySource = readFileSync(agencyPath, "utf-8");

  it("serplab enforces 100dvh root wrapper and Google Search Clarity design tokens", () => {
    expect(serplabSource).toContain("min-h-[100dvh]");
    expect(serplabSource).toContain("bg-background");
    expect(serplabSource).toContain("bg-surface-pure");
    expect(serplabSource).toContain("border-border-subtle");
    expect(serplabSource).toContain("text-text-primary");
    expect(serplabSource).toContain("text-text-secondary");
  });

  it("serplab provides Google SERP simulator controls and pixel ruler", () => {
    expect(serplabSource).toContain("Hľadaný výraz (Target Query)");
    expect(serplabSource).toContain("Dopyt a vyhľadávacie prostredie");
    expect(serplabSource).toContain("Meta Tagy & Text Snippetu");
    expect(serplabSource).toContain("Rich Snippets (Produkt & Sklad & Recenzie)");
    expect(serplabSource).toContain("Google SERP Náhľad");
    expect(serplabSource).toContain("Schema.org JSON-LD");
  });

  it("agency settings includes live client portal preview and custom CNAME", () => {
    expect(agencySource).toContain("Agentúrny Whitelabel Hub");
    expect(agencySource).toContain("Živý náhľad klientskeho portálu");
    expect(agencySource).toContain("Vlastná subdoména klientskeho portálu (CNAME)");
    expect(agencySource).toContain("Live Preview");
  });
});
