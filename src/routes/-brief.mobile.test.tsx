import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AI SEO Content Brief (Search Clarity 100dvh Mobile & Desktop)", () => {
  const briefSrc = readFileSync(resolve("src/routes/brief.tsx"), "utf8");

  it("enforces Search Clarity surface and safe-area padding for 100dvh mobile shell", () => {
    expect(briefSrc).toContain("bg-surface");
    expect(briefSrc).toContain("pb-safe");
    expect(briefSrc).toContain("pb-28");
    expect(briefSrc).toContain("AI SEO Content Brief");
    expect(briefSrc).toContain("Shoptet v2.4");
  });

  it("renders 4 SEO metric summary cards with Search Clarity tokens", () => {
    expect(briefSrc).toContain("Mesačná Hľadanosť");
    expect(briefSrc).toContain("Náročnosť (KD)");
    expect(briefSrc).toContain("Zámer Hľadania");
    expect(briefSrc).toContain("Odporúčaná Dĺžka");
  });

  it("includes realistic Google Mobile SERP preview snippet", () => {
    expect(briefSrc).toContain("Google.sk Mobilný SERP Náhľad");
    expect(briefSrc).toContain("mojeshop.sk");
    expect(briefSrc).toContain("bezecka-obuv-na-asfalt");
    expect(briefSrc).toContain("Titulok: 58 / 60 znakov");
  });

  it("renders heading outline structure and interactive PAA questions", () => {
    expect(briefSrc).toContain("Navrhovaná štruktúra nadpisov (Osnova)");
    expect(briefSrc).toContain("H1");
    expect(briefSrc).toContain("H2");
    expect(briefSrc).toContain("H3");
    expect(briefSrc).toContain("Google PAA (Ľudia sa tiež pýtajú)");
    expect(briefSrc).toContain("Ako často meniť bežeckú obuv na asfalt?");
  });

  it("renders LSI entities and connected Shoptet catalog products", () => {
    expect(briefSrc).toContain("Sémantické Entity (LSI)");
    expect(briefSrc).toContain("tlmenie došľapu");
    expect(briefSrc).toContain("Nike Air Zoom Pegasus 40");
    expect(briefSrc).toContain("Vložiť do osnovy");
  });

  it("provides workflow CTA actions to Calendar and SEO Raketa", () => {
    expect(briefSrc).toContain("Zaradiť do Kalendára");
    expect(briefSrc).toContain("Odpáliť v SEO Rakete");
    expect(briefSrc).toContain("Export .md");
  });
});
