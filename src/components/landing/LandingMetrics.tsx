// Feature tiles only. No invented statistics: every claim here maps to a feature that exists
// in the app (/audit, /decay, /raketa). Add numbers only when they are measured and sourced.
const TILES = [
  {
    label: "SEO audit domén",
    icon: "travel_explore",
    tone: "text-secondary",
    iconBg: "bg-secondary-container/50 text-secondary",
    headline: "On-page",
    body: "Title, meta description, nadpisy a CTA zo skutočne stiahnutej úvodnej stránky, porovnané s konkurenciou.",
  },
  {
    label: "Content Decay Radar",
    icon: "trending_down",
    tone: "text-primary",
    iconBg: "bg-primary-fixed/50 text-primary",
    headline: "Search Console",
    body: "Poklesy zobrazení a kliknutí z vašich vlastných dát v Google Search Console.",
  },
  {
    label: "SEO Raketa",
    icon: "edit_note",
    tone: "text-on-surface",
    iconBg: "bg-tertiary-fixed/60 text-tertiary",
    headline: "AI Writer",
    body: "Návrh obsahu a meta tagov na základe porovnania vašej stránky s konkurenciou.",
  },
  {
    label: "Transparentné dáta",
    icon: "verified",
    tone: "text-text-primary",
    iconBg: "bg-surface-container text-on-surface-variant",
    headline: "Bez odhadov",
    body: "Ak údaj nevieme zmerať, v reporte ho označíme ako chýbajúci namiesto vymysleného čísla.",
  },
] as const;

export function LandingMetrics() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24" id="nastroje">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TILES.map((t) => (
          <div
            key={t.label}
            className="group bg-surface-pure border border-border-default hover:border-google-blue-bright p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-md text-label-md text-text-secondary">{t.label}</span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${t.iconBg}`}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span
                className={`font-headline-lg text-headline-lg font-bold tracking-tight ${t.tone}`}
              >
                {t.headline}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary">{t.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
