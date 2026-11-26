import { describe, expect, it } from "vitest";
import { checkoutPlanLabel } from "./billing-ui";
import { PRICE_LINE_LABEL } from "./pricing-proposal";
import { PLANS } from "./slovak-billing";

describe("checkout plan labels (display only)", () => {
  it("shows the confirmed 99 € + 39 € excl. VAT copy for Pro, not the billed 39 €", () => {
    expect(checkoutPlanLabel("pro")).toBe(`SEO4WEB Pro (${PRICE_LINE_LABEL})`);
    expect(PLANS.pro.priceMonthly).toBe(39);
  });

  it("shows the same confirmed display price for Agency, not the billed 89 € or 290 €/year", () => {
    expect(checkoutPlanLabel("agency")).toBe(`SEO4WEB Agency (${PRICE_LINE_LABEL})`);
    expect(PLANS.agency.priceMonthly).toBe(89);
    expect(checkoutPlanLabel("agency")).not.toMatch(/89 €|290 €/);
  });
});
