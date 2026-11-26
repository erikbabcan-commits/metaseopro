import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Content Decay Radar (/decay) Search Clarity Design System & 100dvh Layout", () => {
  const decayPath = resolve("src/routes/decay.tsx");
  const source = readFileSync(decayPath, "utf-8");

  it("enforces 100dvh root wrapper with background token and proper text colors", () => {
    expect(source).toContain("min-h-[100dvh]");
    expect(source).toContain("bg-background");
    expect(source).toContain("text-on-surface");
    expect(source).toContain("pb-28 md:pb-16");
  });

  it("contains Google 4-Color Accent Strip", () => {
    expect(source).toContain("bg-google-blue-bright");
    expect(source).toContain("bg-google-red");
    expect(source).toContain("bg-google-yellow");
    expect(source).toContain("bg-google-green");
  });

  it("uses Google Search Clarity tokens and eliminates raw shadcn muted styles", () => {
    expect(source).toContain("bg-surface-pure");
    expect(source).toContain("border-border-subtle");
    expect(source).toContain("text-text-primary");
    expect(source).toContain("text-text-secondary");
    expect(source).toContain("bg-primary-container");
    expect(source).not.toContain("bg-muted/50");
  });

  it("displays 4 key KPI metric cards", () => {
    expect(source).toContain("Stratené kliky / mesiac");
    expect(source).toContain("Ohrozené stránky");
    expect(source).toContain("Priemerný prepad pozície");
    expect(source).toContain("Úspešnosť obnovy");
  });

  it("includes filter chips for critical and warning decay", () => {
    expect(source).toContain("Kritické prepady");
    expect(source).toContain("Varovania");
  });

  it("integrates AI rescue plan generation and writer handoff", () => {
    expect(source).toContain("generatePlan");
    expect(source).toContain("sendToWriter");
    expect(source).toContain("handoffToWriter");
    expect(source).toContain("Otvoriť v AI Writeri");
  });
});
