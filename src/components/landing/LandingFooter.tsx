import { Link } from "@tanstack/react-router";

export function LandingFooter() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Bottom CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="bg-primary text-on-primary rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-lg">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="font-headline-lg text-headline-lg font-bold text-white mb-4">
              Pripravení dominovať v Google vyhľadávaní?
            </h2>
            <p className="font-body-lg text-body-lg text-primary-fixed mb-8">
              Získajte kompletný audit vášho e-shopu do 30 sekúnd bez nutnosti zadávať platobnú
              kartu.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                className="google-pill-btn px-8 py-3.5 rounded-full bg-surface-pure text-primary font-label-lg text-label-lg font-bold shadow-md hover:bg-surface-container transition-all cursor-pointer"
                onClick={scrollToTop}
                type="button"
              >
                Začať bezplatný audit teraz
              </button>
              <a
                className="google-pill-btn px-6 py-3.5 rounded-full border border-primary-fixed/50 text-white font-label-lg text-label-lg hover:bg-primary-container transition-colors"
                href="#cennik"
              >
                Zobraziť všetky balíky
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-pure border-t border-border-default py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <Link to="/" className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
                  <span className="material-symbols-outlined text-[16px]">search_insights</span>
                </div>
                <span className="font-headline-sm text-headline-sm text-text-primary font-bold">
                  Seo4web
                </span>
              </Link>
              <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                Autentická technická SEO platforma s integrovaným AI Writerom vyladeným pre Google
                algoritmy.
              </p>
            </div>

            <div>
              <h4 className="font-label-lg text-label-lg font-bold text-text-primary mb-3">
                Nástroje
              </h4>
              <ul className="space-y-2 font-body-sm text-body-sm text-text-secondary">
                <li>
                  <Link to="/audit" className="hover:text-primary transition-colors">
                    Live Crawler &amp; Audit
                  </Link>
                </li>
                <li>
                  <a className="hover:text-primary transition-colors" href="#ai-writer">
                    AI Writer pre E-shopy
                  </a>
                </li>
                <li>
                  <Link to="/decay" className="hover:text-primary transition-colors">
                    Content Decay Radar
                  </Link>
                </li>
                <li>
                  <Link to="/raketa" className="hover:text-primary transition-colors">
                    SEO Raketa (GSC + WP)
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-label-lg text-label-lg font-bold text-text-primary mb-3">
                Spoločnosť
              </h4>
              <ul className="space-y-2 font-body-sm text-body-sm text-text-secondary">
                <li>
                  <a className="hover:text-primary transition-colors" href="#pripadove-studie">
                    Prípadové štúdie
                  </a>
                </li>
                <li>
                  <a className="hover:text-primary transition-colors" href="#cennik">
                    Cenník
                  </a>
                </li>
                <li>
                  <a className="hover:text-primary transition-colors" href="#faq">
                    FAQ
                  </a>
                </li>
                <li>
                  <Link to="/login" className="hover:text-primary transition-colors">
                    Zákaznícka zóna
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border-subtle pt-6 flex flex-col sm:flex-row items-center justify-between text-text-secondary font-label-sm text-label-sm gap-4">
            <p>
              © {new Date().getFullYear()} Seo4web. Všetky práva vyhradené. Vytvorené v štýle Google
              Search Clarity.
            </p>
            <div className="flex gap-4">
              <a className="hover:text-text-primary transition-colors" href="#">
                Podmienky používania
              </a>
              <a className="hover:text-text-primary transition-colors" href="#">
                Cookies nastavenia
              </a>
              <a className="hover:text-text-primary transition-colors" href="#">
                Kontakt
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
