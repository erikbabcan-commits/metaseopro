import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");

describe("landing hero/metrics make no unverified claims", () => {
  const hero = read("src/components/landing/LandingHero.tsx");
  const metrics = read("src/components/landing/LandingMetrics.tsx");
  const index = read("src/routes/index.tsx");

  it.each([
    "Live Crawler v3.8",
    "99.8%",
    "200 OK",
    "Simulujeme Googlebot",
    "pulse-laser",
    "live crawler indikátorom",
  ])("hero has no %s", (s) => {
    expect(hero).not.toContain(s);
  });

  it("metrics contain no invented numbers", () => {
    for (const s of ["+148", "93.4", "30 s", "150 URL", "10 000+"])
      expect(metrics).not.toContain(s);
    expect(metrics).not.toMatch(/\d+\s?%/);
  });

  it("landing meta / og / twitter descriptions do not advertise a live crawler", () => {
    expect(index).not.toMatch(/live crawler/i);
  });
});
