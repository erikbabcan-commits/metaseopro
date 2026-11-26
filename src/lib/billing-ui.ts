import { PLANS, type PlanId } from "./slovak-billing";
import { AGENCY_PRICE_EUR, VAT_NOTE } from "./pricing";

/** Display the same plan name and monthly amount used by the billing configuration. */
export function checkoutPlanLabel(plan: Exclude<PlanId, "free">): string {
  const config = PLANS[plan];
  // Agency has no verified Stripe price yet: never print an amount for it.
  if (plan === "agency" && AGENCY_PRICE_EUR === null) return `SEO4WEB ${config.name}`;
  return `SEO4WEB ${config.name} (${config.priceMonthly} € / mesiac ${VAT_NOTE})`;
}
