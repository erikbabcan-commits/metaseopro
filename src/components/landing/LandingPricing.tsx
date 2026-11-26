import { Link } from "@tanstack/react-router";
import {
  AGENCY_PRICE_EUR,
  AGENCY_PUBLIC,
  AUDIT_PASS_PRICE_EUR,
  PRO_PRICE_EUR,
  VAT_NOTE,
  formatEur,
} from "@/lib/pricing";
import { AUDIT_PASS_CHECKOUT_URL } from "@/lib/slovak-billing";

function Feature({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`material-symbols-outlined ${muted ? "text-secondary" : "text-google-green"} text-[18px]`}
      >
        check_circle
      </span>
      {children}
    </li>
  );
}

export function LandingPricing() {
  // Agency has no Stripe price yet: its card is rendered only when explicitly enabled.
  const agencyPrice = AGENCY_PUBLIC ? AGENCY_PRICE_EUR : null;
  const showAgency = agencyPrice !== null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24" id="cennik">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="font-headline-lg text-headline-lg text-text-primary mb-3 font-semibold">
          Jednoduchý cenník
        </h2>
        <p className="font-body-lg text-body-lg text-text-secondary">
          Začnite zadarmo. Všetky ceny sú uvedené {VAT_NOTE}.
        </p>
      </div>

      {/* Tier Cards */}
      <div className={`grid grid-cols-1 gap-6 ${showAgency ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        {/* Free Card */}
        <div className="pricing-card bg-surface-pure border border-border-default hover:border-outline p-8 rounded-3xl transition-all duration-300 hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">
                Free
              </h3>
              <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-surface-container text-text-secondary font-medium">
                Na vyskúšanie
              </span>
            </div>
            <div className="mb-6">
              <span className="font-display-mobile text-display-mobile font-bold text-text-primary">
                {formatEur(0)}
              </span>
            </div>
            <ul className="space-y-3 font-body-sm text-body-sm text-text-secondary mb-8">
              <Feature muted>1 sledovaný web</Feature>
              <Feature muted>Audit až 3 URL naraz</Feature>
              <Feature muted>Záchranný plán pre prvé 3 podstránky</Feature>
            </ul>
          </div>
          <Link
            to="/login"
            className="google-pill-btn w-full py-3 rounded-full border border-border-default hover:border-primary text-primary hover:bg-primary-fixed/30 font-label-lg text-label-lg font-semibold transition-all text-center block"
          >
            Začať zadarmo
          </Link>
        </div>

        {/* Professional Card (Highlighted) */}
        <div className="pricing-card relative bg-surface-pure border-2 border-primary-container p-8 rounded-3xl shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary-container text-on-primary-container px-3.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold tracking-wide shadow-xs">
            Najpopulárnejší balík
          </div>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">Pro</h3>
              <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-semibold">
                Odporúčané
              </span>
            </div>
            <div className="mb-6">
              <span className="font-display-mobile text-display-mobile font-bold text-primary-container">
                {formatEur(PRO_PRICE_EUR)}
              </span>
              <span className="text-text-secondary font-body-sm text-body-sm ml-1.5">
                / mesiac {VAT_NOTE}
              </span>
            </div>
            <ul className="space-y-3 font-body-sm text-body-sm text-on-surface mb-8">
              <Feature>
                <strong>Až 5 sledovaných webov</strong>
              </Feature>
              <Feature>Neobmedzená analýza URL a domén</Feature>
              <Feature>Plný Content Decay Radar</Feature>
              <Feature>WordPress exporty</Feature>
            </ul>
          </div>
          <Link
            to="/login"
            className="google-pill-btn w-full py-3 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg font-semibold shadow-xs transition-all text-center block"
          >
            Aktivovať Pro
          </Link>
        </div>

        {/* Audit Pass Card */}
        <div className="pricing-card bg-surface-pure border border-border-default hover:border-outline p-8 rounded-3xl transition-all duration-300 hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">
                Fast-Track Audit Pass
              </h3>
              <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-surface-container text-text-secondary font-medium">
                Jednorazovo
              </span>
            </div>
            <div className="mb-6">
              <span className="font-display-mobile text-display-mobile font-bold text-text-primary">
                {formatEur(AUDIT_PASS_PRICE_EUR)}
              </span>
              <span className="text-text-secondary font-body-sm text-body-sm ml-1.5">
                jednorazovo {VAT_NOTE}
              </span>
            </div>
            <ul className="space-y-3 font-body-sm text-body-sm text-text-secondary mb-8">
              <Feature muted>Kompletný audit webu a kanibalizácia kľúčových slov</Feature>
              <Feature muted>Detekcia prepadov návštevnosti</Feature>
              <Feature muted>Optimalizácia TOP 5 kategórií</Feature>
            </ul>
          </div>
          <a
            href={AUDIT_PASS_CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="google-pill-btn w-full py-3 rounded-full border border-border-default hover:border-primary text-primary hover:bg-primary-fixed/30 font-label-lg text-label-lg font-semibold transition-all text-center block"
          >
            Objednať Audit Pass
          </a>
        </div>

        {/* Agency Card: hidden until it has a verified Stripe price (see lib/pricing.ts) */}
        {agencyPrice !== null && (
          <div className="pricing-card bg-surface-pure border border-border-default hover:border-outline p-8 rounded-3xl transition-all duration-300 hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">
                  Agency
                </h3>
                <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-surface-container text-text-secondary font-medium">
                  Pre agentúry
                </span>
              </div>
              <div className="mb-6">
                <span className="font-display-mobile text-display-mobile font-bold text-text-primary">
                  {formatEur(agencyPrice)}
                </span>
                <span className="text-text-secondary font-body-sm text-body-sm ml-1.5">
                  / mesiac {VAT_NOTE}
                </span>
              </div>
              <ul className="space-y-3 font-body-sm text-body-sm text-text-secondary mb-8">
                <Feature muted>Neobmedzený počet webov</Feature>
                <Feature muted>White-label klientsky portál</Feature>
              </ul>
            </div>
            <Link
              to="/login"
              className="google-pill-btn w-full py-3 rounded-full border border-border-default hover:border-primary text-primary hover:bg-primary-fixed/30 font-label-lg text-label-lg font-semibold transition-all text-center block"
            >
              Aktivovať Agency
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
