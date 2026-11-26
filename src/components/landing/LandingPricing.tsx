import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BASE_PRICE_EUR_EXCL_VAT,
  EXTRA_SITE_PRICE_EUR_EXCL_VAT,
  MAX_SITES_IN_CALCULATOR,
  monthlyPriceExclVat,
  TRIAL_CTA,
  TRIAL_LABEL,
} from "@/lib/pricing-proposal";

// Display-only: Erik confirmed 99 € + 39 € excl. VAT and a 14-day trial (2026-11-26).
// Stripe/PLANS still charge the old monthly amounts with no trial — see docs/plans/2026-11-26-pricing-unify.md.
const FEATURES = [
  "SEO audit domén a porovnanie s konkurenciou",
  "Content Decay Radar z vašich dát v Google Search Console",
  "SEO Raketa: AI návrh obsahu a meta tagov",
  "Export do WordPressu a klientsky report (PDF)",
] as const;

export function LandingPricing() {
  const [sites, setSites] = useState(1);
  const total = monthlyPriceExclVat(sites);
  const unit = sites === 1 ? "stránka" : sites >= 2 && sites <= 4 ? "stránky" : "stránok";

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24" id="cennik">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="font-headline-lg text-headline-lg text-text-primary mb-3 font-semibold">
          Jednoduchý cenník
        </h2>
        <p className="font-body-lg text-body-lg text-text-secondary">
          {BASE_PRICE_EUR_EXCL_VAT} € za prvú stránku a {EXTRA_SITE_PRICE_EUR_EXCL_VAT} € za každú
          ďalšiu. Ceny sú uvedené bez DPH.
        </p>
      </div>

      <div className="max-w-2xl mx-auto bg-surface-pure border border-border-default rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <label
            htmlFor="pricing-domain-count"
            className="font-label-lg text-label-lg text-text-secondary"
          >
            Počet stránok (webov):
          </label>
          <span className="font-headline-md text-headline-md font-bold text-primary">
            {sites} {unit}
          </span>
        </div>
        <input
          id="pricing-domain-count"
          aria-valuetext={`${sites} ${unit}`}
          className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
          max={MAX_SITES_IN_CALCULATOR}
          min={1}
          onChange={(e) => setSites(parseInt(e.target.value, 10))}
          type="range"
          value={sites}
        />
        <div className="mt-6 flex items-baseline justify-center gap-2">
          <span className="font-display-mobile text-display-mobile font-bold text-text-primary">
            {total} €
          </span>
          <span className="text-text-secondary font-body-sm text-body-sm">/ mesiac bez DPH</span>
        </div>
        <p className="mt-2 text-center font-body-sm text-body-sm text-text-secondary">
          Prvých {TRIAL_LABEL}.
        </p>
        <ul className="mt-6 space-y-3 font-body-sm text-body-sm text-text-secondary">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-secondary text-[18px]"
                aria-hidden="true"
              >
                check_circle
              </span>
              {f}
            </li>
          ))}
        </ul>
        <Link
          to="/login"
          className="google-pill-btn mt-8 w-full py-3 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg font-semibold transition-all text-center block"
        >
          {TRIAL_CTA}
        </Link>
      </div>
    </section>
  );
}
