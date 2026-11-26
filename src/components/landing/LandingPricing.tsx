import { useState } from "react";
import { Link } from "@tanstack/react-router";

export function LandingPricing() {
  const [isYearly, setIsYearly] = useState(false);
  const [domainCount, setDomainCount] = useState(3);

  const discount = isYearly ? 0.8 : 1.0;
  const periodLabel = isYearly ? "/ mes. (fakturované ročne)" : "/ mesačne";

  const starterFinal = Math.round(19 * discount);
  const proBase = 29 + domainCount * 6.5;
  const proFinal = Math.round(proBase * discount);
  const agencyBase = 99 + domainCount * 3.5;
  const agencyFinal = Math.round(agencyBase * discount);

  let domainUnit = "domén";
  if (domainCount === 1) domainUnit = "doména";
  else if (domainCount >= 2 && domainCount <= 4) domainUnit = "domény";

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24" id="cennik">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="font-headline-lg text-headline-lg text-text-primary mb-3 font-semibold">
          Flexibilná kalkulačka pre rastúce projekty
        </h2>
        <p className="font-body-lg text-body-lg text-text-secondary">
          Zvoľte si počet sledovaných domén a ušetrite 20 % s ročnou platbou.
        </p>

        {/* Billing toggle */}
        <div className="mt-8 inline-flex items-center p-1 bg-surface-container rounded-full border border-border-default">
          <button
            className={`google-pill-btn px-5 py-2 rounded-full font-label-lg text-label-lg font-medium transition-all cursor-pointer ${
              !isYearly
                ? "bg-surface-pure text-text-primary shadow-xs"
                : "text-text-secondary hover:text-text-primary"
            }`}
            onClick={() => setIsYearly(false)}
            type="button"
          >
            Mesačne
          </button>
          <button
            className={`google-pill-btn px-5 py-2 rounded-full font-label-lg text-label-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              isYearly
                ? "bg-surface-pure text-text-primary shadow-xs"
                : "text-text-secondary hover:text-text-primary"
            }`}
            onClick={() => setIsYearly(true)}
            type="button"
          >
            <span>Ročne</span>
            <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full text-[11px] font-bold">
              -20% zľava
            </span>
          </button>
        </div>
      </div>

      {/* Domain Range Slider */}
      <div className="max-w-2xl mx-auto bg-surface-pure border border-border-default rounded-3xl p-6 sm:p-8 mb-12 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <label
            htmlFor="pricing-domain-count"
            className="font-label-lg text-label-lg text-text-secondary"
          >
            Počet monitorovaných webov / domén:
          </label>
          <span className="font-headline-md text-headline-md font-bold text-primary">
            {domainCount} {domainUnit}
          </span>
        </div>
        <input
          id="pricing-domain-count"
          aria-valuetext={`${domainCount} ${domainUnit}`}
          className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
          max="25"
          min="1"
          onChange={(e) => setDomainCount(parseInt(e.target.value, 10))}
          type="range"
          value={domainCount}
        />
        <div className="flex justify-between text-text-secondary font-label-sm text-label-sm mt-2">
          <span>1 doména</span>
          <span>10 domén</span>
          <span>25 domén</span>
        </div>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Starter Card */}
        <div className="pricing-card bg-surface-pure border border-border-default hover:border-outline p-8 rounded-3xl transition-all duration-300 hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">
                Starter
              </h3>
              <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-surface-container text-text-secondary font-medium">
                Pre jednotlivcov
              </span>
            </div>
            <div className="mb-6">
              <span className="font-display-mobile text-display-mobile font-bold text-text-primary">
                {starterFinal} €
              </span>
              <span className="text-text-secondary font-body-sm text-body-sm ml-1.5">
                {periodLabel}
              </span>
            </div>
            <ul className="space-y-3 font-body-sm text-body-sm text-text-secondary mb-8">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  check_circle
                </span>
                1 auditovaný web
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  check_circle
                </span>
                Týždenný live crawler scan
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  check_circle
                </span>
                5 000 AI Writer tokenov / mes.
              </li>
              <li className="flex items-center gap-2 text-outline-variant">
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                Automatické API napojenie
              </li>
            </ul>
          </div>
          <Link
            to="/login"
            className="google-pill-btn w-full py-3 rounded-full border border-border-default hover:border-primary text-primary hover:bg-primary-fixed/30 font-label-lg text-label-lg font-semibold transition-all text-center block"
          >
            Vybrať Starter
          </Link>
        </div>

        {/* Professional Card (Highlighted) */}
        <div className="pricing-card relative bg-surface-pure border-2 border-primary-container p-8 rounded-3xl shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary-container text-on-primary-container px-3.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold tracking-wide shadow-xs">
            Najpopulárnejší balík
          </div>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">
                Pro Specialist
              </h3>
              <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-semibold">
                Odporúčané
              </span>
            </div>
            <div className="mb-6">
              <span className="font-display-mobile text-display-mobile font-bold text-primary-container">
                {proFinal} €
              </span>
              <span className="text-text-secondary font-body-sm text-body-sm ml-1.5">
                {periodLabel}
              </span>
            </div>
            <ul className="space-y-3 font-body-sm text-body-sm text-on-surface mb-8">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-google-green text-[18px]">
                  check_circle
                </span>
                <strong>
                  {domainCount} monitorované {domainUnit}
                </strong>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-google-green text-[18px]">
                  check_circle
                </span>
                Denný live crawler + Google Core Web Vitals
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-google-green text-[18px]">
                  check_circle
                </span>
                50 000 AI Writer tokenov / mes.
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-google-green text-[18px]">
                  check_circle
                </span>
                Export reportov pre klientov v PDF/CSV
              </li>
            </ul>
          </div>
          <Link
            to="/login"
            className="google-pill-btn w-full py-3 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg font-semibold shadow-xs transition-all text-center block"
          >
            Vyskúšať Pro na 14 dní zadarmo
          </Link>
        </div>

        {/* Agency Card */}
        <div className="pricing-card bg-surface-pure border border-border-default hover:border-outline p-8 rounded-3xl transition-all duration-300 hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">
                Agency Max
              </h3>
              <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-surface-container text-text-secondary font-medium">
                Pre agentúry
              </span>
            </div>
            <div className="mb-6">
              <span className="font-display-mobile text-display-mobile font-bold text-text-primary">
                {agencyFinal} €
              </span>
              <span className="text-text-secondary font-body-sm text-body-sm ml-1.5">
                {periodLabel}
              </span>
            </div>
            <ul className="space-y-3 font-body-sm text-body-sm text-text-secondary mb-8">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  check_circle
                </span>
                Neobmedzený počet domén (až 25+)
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  check_circle
                </span>
                Hodinový real-time crawl &amp; alerty
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  check_circle
                </span>
                Neobmedzený AI Writer s vlastnou personou
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  check_circle
                </span>
                White-label branding a dedikovaný manažér
              </li>
            </ul>
          </div>
          <Link
            to="/login"
            className="google-pill-btn w-full py-3 rounded-full border border-border-default hover:border-primary text-primary hover:bg-primary-fixed/30 font-label-lg text-label-lg font-semibold transition-all text-center block"
          >
            Kontaktovať sales
          </Link>
        </div>
      </div>
    </section>
  );
}
