import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TactileSegmentedBar } from "@/components/TactileSegmentedBar";

describe("AI SEO Command Center (Search Clarity 100dvh mobile)", () => {
  const dashboardSrc = readFileSync(resolve("src/routes/dashboard.tsx"), "utf8");
  const stylesSrc = readFileSync(resolve("src/styles.css"), "utf8");
  const radarSrc = readFileSync(resolve("src/components/OpportunityRadar.tsx"), "utf8");
  const navSrc = readFileSync(resolve("src/components/TactileFloatingNav.tsx"), "utf8");

  it("enforces 100dvh mobile shell and safe-area bottom clearance on /dashboard", () => {
    expect(dashboardSrc).toContain("min-h-[100dvh]");
    expect(dashboardSrc).toContain("env(safe-area-inset-bottom");
    expect(dashboardSrc).toContain("AI SEO Command Center");
    expect(dashboardSrc).toContain("Rýchla URL inšpekcia");
  });

  it("defines Roboto Flex and Search Clarity semantic tokens in styles.css", () => {
    expect(stylesSrc).toContain("Roboto Flex");
    expect(stylesSrc).toContain("--clarity-surface: #faf9fd");
    expect(stylesSrc).toContain("--clarity-primary-container: #1a73e8");
    expect(stylesSrc).toContain("--clarity-google-green: #34a853");
    expect(stylesSrc).toContain("prefers-reduced-motion: reduce");
  });

  it("renders TactileSegmentedBar with Search Clarity tabs", () => {
    const html = renderToStaticMarkup(
      <TactileSegmentedBar
        activeTab="dashboard"
        onTabChange={() => {}}
        counts={{ dashboard: 3, status: 2, projects: 1 }}
      />,
    );
    expect(html).toContain("Prehľad");
    expect(html).toContain("Indexácia");
    expect(html).toContain("Projekty");
  });

  it("includes mobile filter chips and cards in OpportunityRadar without hardcoded hexes", () => {
    expect(radarSrc).toContain("Všetky");
    expect(radarSrc).toContain("Rýchle výhry");
    expect(radarSrc).toContain("Pokles pozícií");
    expect(radarSrc).toContain("Nové trendy");
    expect(radarSrc).not.toMatch(/#ffffff|#000000/i);
    expect(dashboardSrc).not.toMatch(/#ffffff|#000000/i);
  });

  it("uses pb-safe and Search Clarity bottom bar labels in TactileFloatingNav", () => {
    expect(navSrc).toContain("pb-safe");
    expect(navSrc).toContain("Dashboard");
    expect(navSrc).toContain("Raketa");
    expect(navSrc).toContain("Tvorba");
    expect(navSrc).toContain("Radar");
    expect(navSrc).toContain("Nástroje");
  });
});
