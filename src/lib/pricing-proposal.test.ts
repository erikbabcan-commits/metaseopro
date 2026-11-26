import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { monthlyPriceExclVat, PRICE_LINE_LABEL, PRICING_STATUS } from "@/lib/pricing-proposal";

describe("pricing proposal (pending Erik's confirmation)", () => {
  it("is explicitly marked as pending", () => {
    expect(PRICING_STATUS).toBe("pending-erik-confirmation");
  });

  it("99 € for the first site + 39 € for each additional site, excl. VAT", () => {
    expect(monthlyPriceExclVat(1)).toBe(99);
    expect(monthlyPriceExclVat(2)).toBe(138);
    expect(monthlyPriceExclVat(5)).toBe(255);
    expect(monthlyPriceExclVat(0)).toBe(99);
    expect(monthlyPriceExclVat(Number.NaN)).toBe(99);
    expect(PRICE_LINE_LABEL).toContain("bez DPH");
  });

  it.each([
    "src/components/landing/LandingPricing.tsx",
    "src/routes/dashboard.tsx",
    "src/routes/decay.tsx",
  ])("%s no longer shows the old 19/29/49/110 € prices or a 14-day trial", (file) => {
    const src = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(src).not.toMatch(/\b(19|29|49|110) €/);
    expect(src).not.toContain("14 dní zadarmo");
  });
});
