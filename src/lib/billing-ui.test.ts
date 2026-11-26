import { describe, expect, it } from "vitest";
import { checkoutPlanLabel } from "./billing-ui";

describe("checkout plan labels", () => {
  it("labels a Pro checkout with the Stripe Pro monthly price including VAT", () => {
    expect(checkoutPlanLabel("pro")).toBe("SEO4WEB Pro (29 € / mesiac vrátane DPH)");
  });

  it("labels Agency by name only while it has no verified Stripe price", () => {
    expect(checkoutPlanLabel("agency")).toBe("SEO4WEB Agency");
  });
});
