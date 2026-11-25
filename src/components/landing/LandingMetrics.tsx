export function LandingMetrics() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24" id="nastroje">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="group bg-surface-pure border border-border-default hover:border-google-blue-bright p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="font-label-md text-label-md text-text-secondary">Organický rast</span>
            <div className="w-8 h-8 rounded-full bg-secondary-container/50 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-headline-lg text-headline-lg font-bold text-secondary tracking-tight">
              +148 %
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-text-secondary">
            Priemerný nárast organických zobrazení po optimalizácii indexácie.
          </p>
        </div>

        {/* Metric 2 */}
        <div className="group bg-surface-pure border border-border-default hover:border-google-blue-bright p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="font-label-md text-label-md text-text-secondary">
              Google CWV Skóre
            </span>
            <div className="w-8 h-8 rounded-full bg-primary-fixed/50 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">speed</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight">
              93.4 %
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-text-secondary">
            Priemerný auditný index pre LCP, INP a CLS metriky.
          </p>
        </div>

        {/* Metric 3 */}
        <div className="group bg-surface-pure border border-border-default hover:border-google-blue-bright p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="font-label-md text-label-md text-text-secondary">
              Rýchlosť crawlera
            </span>
            <div className="w-8 h-8 rounded-full bg-tertiary-fixed/60 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[18px]">timer</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
              30 s
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-text-secondary">
            Kompletné skenovanie prvých 150 URL a robots.txt stromu.
          </p>
        </div>

        {/* Metric 4 */}
        <div className="group bg-surface-pure border border-border-default hover:border-google-blue-bright p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="font-label-md text-label-md text-text-secondary">Overené domény</span>
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">domain_verification</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
              10 000+
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-text-secondary">
            Webov a e-shopov na slovenskom a českom trhu pod naším monitoringom.
          </p>
        </div>
      </div>
    </section>
  );
}
