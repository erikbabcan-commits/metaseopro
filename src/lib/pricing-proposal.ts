/**
 * NÁVRH CENNÍKA — ČAKÁ NA ERIKOVO POTVRDENIE. NEMERGOVAŤ.
 *
 * Navrhovaný model: 99 € bez DPH za prvú stránku + 39 € bez DPH za každú ďalšiu.
 * Otvorené otázky pre Erika (pozri docs/plans/2026-11-26-pricing-unify.md):
 *  - mesačne alebo jednorazovo? (tu predpoklad: mesačne)
 *  - trial áno/nie a koľko dní? (tu: žiadny trial sa nesľubuje)
 *  - ostáva Free plán? ostáva Audit Pass 99 € jednorazovo?
 *  - Stripe ceny/payment linky musia vzniknúť PRED merge (billing ešte účtuje PLANS 39/89 €).
 * Tento súbor mení iba zobrazované ceny; účtované sumy (slovak-billing.ts PLANS,
 * Stripe payment links) zámerne nemení.
 */
export const PRICING_STATUS = "pending-erik-confirmation" as const;

export const BASE_PRICE_EUR_EXCL_VAT = 99;
export const EXTRA_SITE_PRICE_EUR_EXCL_VAT = 39;
export const MAX_SITES_IN_CALCULATOR = 25;

export function monthlyPriceExclVat(sites: number): number {
  const n = Math.min(
    Math.max(Math.floor(Number.isFinite(sites) ? sites : 1), 1),
    MAX_SITES_IN_CALCULATOR,
  );
  return BASE_PRICE_EUR_EXCL_VAT + (n - 1) * EXTRA_SITE_PRICE_EUR_EXCL_VAT;
}

export const PRICE_SHORT_LABEL = `${BASE_PRICE_EUR_EXCL_VAT} € bez DPH`;
export const PRICE_LINE_LABEL = `${BASE_PRICE_EUR_EXCL_VAT} € / mesiac + ${EXTRA_SITE_PRICE_EUR_EXCL_VAT} € za každú ďalšiu stránku (bez DPH)`;
