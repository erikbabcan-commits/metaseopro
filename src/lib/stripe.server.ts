import Stripe from "stripe";

/**
 * Sanitizes raw environment key by trimming and removing wrapping quotes.
 */
function sanitizeKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/^["'\s]+|["'\s]+$/g, "").trim();
  return cleaned || undefined;
}

/** The API version comes from the locked Stripe SDK, never an `as never` override. */
export function getStripeClient(): Stripe | null {
  const secretKey = sanitizeKey(process.env.STRIPE_SECRET_KEY);
  if (!secretKey) return null;
  if (!/^(?:sk|rk)_(?:test|live)_/.test(secretKey)) {
    throw new Error("Stripe secret key má neplatný formát.");
  }
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
    timeout: 10_000,
    maxNetworkRetries: 2,
  });
}

export function stripeLivemode(): boolean {
  const key = sanitizeKey(process.env.STRIPE_SECRET_KEY);
  if (!key || !/^(?:sk|rk)_(?:test|live)_/.test(key)) {
    throw new Error("Stripe nie je nakonfigurovaný.");
  }
  return /^(?:sk|rk)_live_/.test(key);
}

export function automaticTaxForCheckout(livemode: boolean): boolean {
  const enabled = process.env.STRIPE_AUTOMATIC_TAX_ENABLED === "true";
  if (livemode && !enabled) {
    throw new Error(
      "Živé platby čakajú na nastavenie Stripe Tax a overenie daňových registrácií predajcu.",
    );
  }
  return enabled;
}
