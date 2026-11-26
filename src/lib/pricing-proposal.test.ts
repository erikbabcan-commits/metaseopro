import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  displayPlanLabel,
  monthlyPriceExclVat,
  PRICE_LINE_LABEL,
  PRICING_STATUS,
  TRIAL_CTA,
  TRIAL_DAYS,
  TRIAL_LABEL,
} from "@/lib/pricing-proposal";

describe("confirmed display pricing (Stripe/billing unchanged)", () => {
  it("is marked as Erik-confirmed display only, not as charged amounts", () => {
    expect(PRICING_STATUS).toBe("erik-confirmed-display-only");
    expect(TRIAL_DAYS).toBe(14);
    expect(TRIAL_LABEL).toBe("14 dní zadarmo");
    expect(TRIAL_CTA).toBe("Vyskúšať 14 dní zadarmo");
    expect(PRICE_LINE_LABEL).toContain("99 €");
    expect(PRICE_LINE_LABEL).toContain("39 €");
    expect(PRICE_LINE_LABEL).toContain("bez DPH");
  });

  it("99 € for the first site + 39 € for each additional site, excl. VAT", () => {
    expect(monthlyPriceExclVat(1)).toBe(99);
    expect(monthlyPriceExclVat(2)).toBe(138);
    expect(monthlyPriceExclVat(5)).toBe(255);
    expect(monthlyPriceExclVat(0)).toBe(99);
    expect(monthlyPriceExclVat(Number.NaN)).toBe(99);
  });

  it("labels both Pro and Agency with the confirmed display price, not 39/89/290", () => {
    expect(displayPlanLabel("pro")).toBe(`SEO4WEB Pro (${PRICE_LINE_LABEL})`);
    expect(displayPlanLabel("agency")).toBe(`SEO4WEB Agency (${PRICE_LINE_LABEL})`);
    expect(displayPlanLabel("pro")).not.toMatch(/\b(89|290) €/);
    expect(displayPlanLabel("agency")).not.toMatch(/\b(89|290) €/);
  });

  it.each([
    "src/components/landing/LandingPricing.tsx",
    "src/routes/dashboard.tsx",
    "src/routes/decay.tsx",
    "src/components/PaywallModal.tsx",
    "src/routes/settings.agency.tsx",
    "src/routes/login.tsx",
  ])("%s mentions the 14-day trial and no old 19/29/49/89/110/290 plan prices", (file) => {
    const src = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(src).toMatch(/TRIAL_LABEL|TRIAL_CTA|14 dní zadarmo/);
    expect(src).not.toMatch(/\b(19|29|49|89|110|290) €/);
  });

  it("does not change billed PLANS or invent a Stripe trial", () => {
    const plans = readFileSync(resolve(process.cwd(), "src/lib/slovak-billing.ts"), "utf8");
    expect(plans).toMatch(/priceMonthly:\s*39/);
    expect(plans).toMatch(/priceMonthly:\s*89/);
    const checkout = readFileSync(
      resolve(process.cwd(), "src/lib/billing-checkout.server.ts"),
      "utf8",
    );
    expect(checkout).not.toContain("trial_period_days");
    expect(checkout).toContain("unit_amount: config.priceMonthly * 100");
  });
});
