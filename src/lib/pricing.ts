/**
 * Single source of truth for every public price shown in the UI.
 *
 * These amounts mirror what Stripe actually charges on the live Payment Links
 * (verified 2026-11-26): PRO_DIRECT_CHECKOUT_URL = 29,00 € / month,
 * AUDIT_PASS_CHECKOUT_URL = 99,00 € one-time. `PLANS.pro.priceMonthly` and
 * `AUDIT_PASS_PRICE` in slovak-billing.ts are derived from this module, so the UI
 * and the checkout configuration cannot drift apart.
 *
 * UNVERIFIED: the amount behind STRIPE_PRICE_PRO_MONTHLY (in-app checkout) is
 * configured in Stripe and could not be read; it MUST be 29 €.
 */

/** Pro subscription, EUR per month, VAT included. */
export const PRO_PRICE_EUR = 29;

/** Fast-Track Audit Pass, EUR one-time, VAT included. */
export const AUDIT_PASS_PRICE_EUR = 99;

/** Stripe offers no trial on any plan. Never show trial / "zadarmo na X dní" copy. */
export const TRIAL_DAYS = 0;

/** Suffix shown next to every price. */
export const VAT_NOTE = "vrátane DPH";

/**
 * The Agency plan has no Stripe price yet, so it is hidden from all public pricing UI.
 * Flip to true (and set AGENCY_PRICE_EUR) only after a Stripe price exists.
 * The Agency code paths stay in place behind this flag.
 */
export const AGENCY_PUBLIC = false;

/** Intentionally null: no verified Stripe price for Agency. Do not guess. */
export const AGENCY_PRICE_EUR: number | null = null;

/** "29 €" */
export function formatEur(amount: number): string {
  return `${amount} €`;
}

/** "29 € / mesiac" */
export const PRO_PRICE_LABEL = `${formatEur(PRO_PRICE_EUR)} / mesiac`;

/** "29 € / mesiac vrátane DPH" */
export const PRO_PRICE_LABEL_VAT = `${PRO_PRICE_LABEL} ${VAT_NOTE}`;

/** "99 € jednorazovo" */
export const AUDIT_PASS_PRICE_LABEL = `${formatEur(AUDIT_PASS_PRICE_EUR)} jednorazovo`;

/** "99 € jednorazovo vrátane DPH" */
export const AUDIT_PASS_PRICE_LABEL_VAT = `${AUDIT_PASS_PRICE_LABEL} ${VAT_NOTE}`;

/** Amounts that Stripe's live Payment Links charge (EUR), for tests and docs. */
export const STRIPE_PAYMENT_LINK_AMOUNTS = {
  pro: { amountEur: 29, interval: "month" as const },
  auditPass: { amountEur: 99, interval: "one_time" as const },
} as const;
