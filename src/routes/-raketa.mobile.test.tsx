import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("SEO Raketa (Search Clarity 100dvh Mobile & Desktop)", () => {
  const raketaSrc = readFileSync(resolve("src/routes/raketa.tsx"), "utf8");

  it("enforces Search Clarity surface and safe-area padding for 100dvh mobile shell", () => {
    expect(raketaSrc).toContain("bg-surface");
    expect(raketaSrc).toContain("pb-safe");
    expect(raketaSrc).toContain("pb-28");
    expect(raketaSrc).toContain("Autonómne SEO Workflows");
    expect(raketaSrc).toContain("SEO Raketa");
  });

  it("includes the complete 4-step pipeline stepper", () => {
    expect(raketaSrc).toContain("1. Sken SERP");
    expect(raketaSrc).toContain("2. AI Článok");
    expect(raketaSrc).toContain("3. Brief & E-shop");
    expect(raketaSrc).toContain("4. Publikovanie");
  });

  it("renders Krok 1 with own URL audit, SEO score gauge and SERP competitors", () => {
    expect(raketaSrc).toContain("Krok 1: Sken URL & SERP Konkurencia");
    expect(raketaSrc).toContain("Audit vlastného webu");
    expect(raketaSrc).toContain("Zistené Content Gaps");
    expect(raketaSrc).toContain("Top 3 SERP Konkurenti");
  });

  it("renders Krok 2 with Google Search mobile SERP preview and live streaming support", () => {
    expect(raketaSrc).toContain("Krok 2: AI Generovanie článku");
    expect(raketaSrc).toContain("Mobilný SERP Náhľad (Google.sk)");
    expect(raketaSrc).toContain("Featured Snippet Target");
    expect(raketaSrc).toContain("Štruktúra a hierarchia nadpisov");
    expect(raketaSrc).toContain("Kopírovať článok");
    expect(raketaSrc).toContain("Exportovať .md");
  });

  it("renders Krok 3 with LSI entity chips and connected catalog products", () => {
    expect(raketaSrc).toContain("Krok 3: Brief & Integrácia e-shopu");
    expect(raketaSrc).toContain("Odporúčané LSI entity do textu");
    expect(raketaSrc).toContain("Prepojené produkty z katalógu");
    expect(raketaSrc).toContain("Schema.org Štruktúrované dáta (JSON-LD)");
    expect(raketaSrc).toContain("Kopírovať JSON-LD");
  });

  it("renders Krok 4 with CMS targeting, draft toggle and 1-click green publish button", () => {
    expect(raketaSrc).toContain("Krok 4: Publikovanie do e-shopu & Obsahový plán");
    expect(raketaSrc).toContain("Publikovať ako koncept");
    expect(raketaSrc).toContain("Publikovať do e-shopu jedným klikom");
  });

  it("renders SERP Prediction Impact & ROI box", () => {
    expect(raketaSrc).toContain("Predikovaný SERP výsledok a ROI");
    expect(raketaSrc).toContain("Posun v pozícii");
    expect(raketaSrc).toContain("Mesačný prínos");
    expect(raketaSrc).toContain("Úspora na PPC");
  });
});
