import type { PlanId } from "./slovak-billing";
import { displayPlanLabel } from "./pricing-proposal";

/**
 * Zobrazovaný názov plánu v UI (potvrdený cenník 99 € + 39 € bez DPH).
 * Účtovaná suma je stále `PLANS[plan].priceMonthly` (Pro 39, Agency 89) — nemeniť
 * túto funkciu tak, aby maskovala nesúlad ako keby už Stripe účtoval 99 €.
 */
export function checkoutPlanLabel(plan: Exclude<PlanId, "free">): string {
  return displayPlanLabel(plan);
}
