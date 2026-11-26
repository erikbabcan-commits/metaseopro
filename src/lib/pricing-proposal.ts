/**
 * Zobrazovaný cenník (potvrdený Erikom 2026-11-26, 23:05, doslovne cez TIC TAC):
 * „Potvrdzujem 99 € + 39 € bez DPH, trial 14 dní“.
 *
 * Tento súbor riadi IBA text v UI. Účtované sumy v `slovak-billing.ts` (`PLANS.pro` 39 €,
 * `PLANS.agency` 89 €), Stripe Price ID, payment linky (`PRO_DIRECT_CHECKOUT_URL`,
 * `AUDIT_PASS_CHECKOUT_URL`) a `trial_period_days` v checkoute ZÁMERNE NEMENÍ.
 * Kým Erik nenastaví nové Stripe ceny a 14-dňový trial, zobrazená cena a trial
 * sa nezhodujú s tým, čo Stripe reálne naúčtuje (pozri
 * docs/plans/2026-11-26-pricing-unify.md).
 */
export const PRICING_STATUS = "erik-confirmed-display-only" as const;

export const BASE_PRICE_EUR_EXCL_VAT = 99;
export const EXTRA_SITE_PRICE_EUR_EXCL_VAT = 39;
export const MAX_SITES_IN_CALCULATOR = 25;
export const TRIAL_DAYS = 14;

export function monthlyPriceExclVat(sites: number): number {
  const n = Math.min(
    Math.max(Math.floor(Number.isFinite(sites) ? sites : 1), 1),
    MAX_SITES_IN_CALCULATOR,
  );
  return BASE_PRICE_EUR_EXCL_VAT + (n - 1) * EXTRA_SITE_PRICE_EUR_EXCL_VAT;
}

export const PRICE_SHORT_LABEL = `${BASE_PRICE_EUR_EXCL_VAT} € bez DPH`;
export const PRICE_LINE_LABEL = `${BASE_PRICE_EUR_EXCL_VAT} € / mesiac + ${EXTRA_SITE_PRICE_EUR_EXCL_VAT} € za každú ďalšiu stránku (bez DPH)`;
export const TRIAL_LABEL = `${TRIAL_DAYS} dní zadarmo`;
export const TRIAL_CTA = `Vyskúšať ${TRIAL_DAYS} dní zadarmo`;

/** Zobrazovaný názov plánu. Nie je to účtovaná suma (tá ostáva v PLANS). */
export function displayPlanLabel(plan: "pro" | "agency"): string {
  const name = plan === "agency" ? "Agency" : "Pro";
  return `SEO4WEB ${name} (${PRICE_LINE_LABEL})`;
}
