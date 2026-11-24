import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Obsahový Plán & Kalendár (Search Clarity 100dvh Mobile & Desktop)", () => {
  const planSrc = readFileSync(resolve("src/routes/plan.tsx"), "utf8");

  it("enforces Search Clarity surface and safe-area padding for 100dvh mobile shell", () => {
    expect(planSrc).toContain("bg-surface");
    expect(planSrc).toContain("pb-safe");
    expect(planSrc).toContain("pb-28");
    expect(planSrc).toContain("Obsahový kalendár");
    expect(planSrc).toContain("CMS Shoptet");
  });

  it("renders the 4 KPI summary cards with Search Clarity styling", () => {
    expect(planSrc).toContain("Naplnenie slotov");
    expect(planSrc).toContain("Predikovaný dosah");
    expect(planSrc).toContain("Pripravené na CMS");
    expect(planSrc).toContain("Priemerné SEO skóre");
  });

  it("includes AI predictive recommendation callout", () => {
    expect(planSrc).toContain("AI Sezónny signál");
    expect(planSrc).toContain("vitamín d3 imunita jeseň");
    expect(planSrc).toContain("Zobraziť slot 24. Okt");
  });

  it("renders 7-day weekly calendar strip and daily article agenda", () => {
    expect(planSrc).toContain("Týždeň 42");
    expect(planSrc).toContain("Agenda: ");
    expect(planSrc).toContain("Ako vybrať bežeckú obuv na asfalt: Veľký sprievodca");
    expect(planSrc).toContain("Mesačná Hľadanosť");
    expect(planSrc).toContain("Náročnosť (KD)");
    expect(planSrc).toContain("Prepojený E-shop Produkt");
    expect(planSrc).toContain("Nike Air Zoom Pegasus 40");
  });

  it("provides 1-Click CMS publish and SEO Raketa launcher actions", () => {
    expect(planSrc).toContain("1-Click Publikovať Shoptet");
    expect(planSrc).toContain("Odpáliť v SEO Rakete");
  });

  it("supports monthly matrix view and AI 30-day plan generator", () => {
    expect(planSrc).toContain("Pondelok");
    expect(planSrc).toContain("Piatok");
    expect(planSrc).toContain("AI Generátor 30-dňového obsahového plánu");
    expect(planSrc).toContain("Vygenerovať 30-dňový plán");
  });
});
