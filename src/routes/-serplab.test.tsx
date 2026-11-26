import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("SerpLab Sandbox (/serplab) & Whitelabel Hub (/settings/agency) Desktop & Mobile UI", () => {
  const serplabPath = resolve("src/routes/serplab.tsx");
  const serplabSource = readFileSync(serplabPath, "utf-8");

  const agencyPath = resolve("src/routes/settings.agency.tsx");
  const agencySource = readFileSync(agencyPath, "utf-8");

  const floatingNavPath = resolve("src/components/TactileFloatingNav.tsx");
  const floatingNavSource = readFileSync(floatingNavPath, "utf-8");

  it("serplab enforces 100dvh root wrapper and Search Clarity design tokens", () => {
    expect(serplabSource).toContain("min-h-[100dvh]");
    expect(serplabSource).toContain("bg-background");
    expect(serplabSource).toContain("bg-surface-pure");
    expect(serplabSource).toContain("border-border-subtle");
    expect(serplabSource).toContain("text-text-primary");
    expect(serplabSource).toContain("text-text-secondary");
  });

  it("serplab provides full desktop & mobile SERP simulator controls and pixel ruler", () => {
    expect(serplabSource).toContain("Hľadaný výraz (Target Query)");
    expect(serplabSource).toContain("Dopyt a vyhľadávacie prostredie");
    expect(serplabSource).toContain("Meta Tagy & CTR Optimalizátor");
    expect(serplabSource).toContain("Schema.org Snippets Builder");
    expect(serplabSource).toContain("Google SERP Náhľad");
    expect(serplabSource).toContain("Schema.org JSON-LD");
  });

  it("serplab includes mobile segmented tabs, AI CTR pills, and competitor contrast", () => {
    // Mobile segmented tabs
    expect(serplabSource).toContain("serp-tab");
    expect(serplabSource).toContain("SERP Náhľad");
    expect(serplabSource).toContain("Meta & CTR");
    expect(serplabSource).toContain("Schema.org");
    expect(serplabSource).toContain("JSON-LD");

    // AI CTR Accelerators
    expect(serplabSource).toContain("AI_CTR_SUGGESTIONS");
    expect(serplabSource).toContain("ai-pill");
    expect(serplabSource).toContain("+ Zľava 15% + Doprava");
    expect(serplabSource).toContain("+ Test & Recenzia 2025");
    expect(serplabSource).toContain("+ Skladom ihneď");

    // Competitor Contrast Card (#2)
    expect(serplabSource).toContain("Pozícia #2 • Konkurencia");
    expect(serplabSource).toContain("Bez Rich Snippets");

    // Benchmark Impact Panel
    expect(serplabSource).toContain("Odhadovaný vplyv optimalizácie");
    expect(serplabSource).toContain("Odhadované CTR");
    expect(serplabSource).toContain("Noví návštevníci");
    expect(serplabSource).toContain("Úspora Ads");
  });

  it("agency settings includes live client portal preview, custom CNAME, and mobile 4-section flow", () => {
    expect(agencySource).toContain("Agentúrny Whitelabel Hub");
    expect(agencySource).toContain("Živý náhľad klientskeho portálu");
    expect(agencySource).toContain("Vlastná Subdoména & CNAME");
    expect(agencySource).toContain("Live Preview");

    // Mobile 4-section architecture
    expect(agencySource).toContain("Vlastná značka & Branding");
    expect(agencySource).toContain("Distribúcia a Klientske Reporty");

    // CNAME Toggle and DNS Verification
    expect(agencySource).toContain("cname-toggle");
    expect(agencySource).toContain("Overiť DNS");
    expect(agencySource).toContain("SSL Certifikát aktívny (TLS 1.3)");

    // Registrar Guides
    expect(agencySource).toContain("WebSupport");
    expect(agencySource).toContain("Cloudflare");
    expect(agencySource).toContain("Forpsi");

    // Smartphone Mockup Frame
    expect(agencySource).toContain("09:41");
    expect(agencySource).toContain("SEO Skóre");
    expect(agencySource).toContain("mojeshop.sk");

    // Mobile Fixed Bottom Bar
    expect(agencySource).toContain("save-whitelabel-btn");
    expect(agencySource).toContain("Zahodiť zmeny");
  });

  it("tactile floating navigation includes SerpLab in the tools drawer", () => {
    expect(floatingNavSource).toContain('to="/serplab"');
    expect(floatingNavSource).toContain("SerpLab Sandbox & SERP");
    expect(floatingNavSource).toContain("Google simulátor, rich snippety a CTR");
  });
});
