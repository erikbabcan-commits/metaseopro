import { useEffect, useState } from "react";
import { Share, PlusSquare, X, Smartphone, Zap, ShieldCheck } from "lucide-react";

export function IosInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    const ua = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|opt/.test(ua);
    const isStandalone =
      ("standalone" in window.navigator &&
        (window.navigator as unknown as { standalone: boolean }).standalone) ||
      window.matchMedia("(display-mode: standalone)").matches;

    // Check if user previously dismissed prompt in the last 7 days
    const dismissedAt = localStorage.getItem("seo4web_ios_prompt_dismissed");
    const isRecentlyDismissed =
      dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 7 * 24 * 60 * 60 * 1000;

    if (isIos && !isStandalone && !isRecentlyDismissed) {
      // Delay presentation by 3.5 seconds so user first sees the landing page/dashboard
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("seo4web_ios_prompt_dismissed", Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9000] p-4 pb-8 sm:pb-6 pointer-events-none animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="mx-auto max-w-md pointer-events-auto rounded-2xl border border-border-default bg-surface-pure/95 backdrop-blur-xl p-5 shadow-lg text-on-surface">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/icons/apple-touch-icon-180.png"
              alt="SEO4WEB App Icon"
              className="h-12 w-12 rounded-xl border border-border-subtle shadow-sm"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-text-primary">Nainštalovať SEO4WEB</h3>
                <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-[10px] font-semibold text-on-primary-fixed">
                  PWA pre iPhone
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Pridajte aplikáciu priamo na svoju plochu
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Zatvoriť"
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-container hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Benefits Pill */}
        <div className="mt-3.5 grid grid-cols-3 gap-2 border-y border-border-subtle py-2.5 text-[11px] text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-google-green shrink-0" />
            <span>0 ms štart</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Celá plocha</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-google-green shrink-0" />
            <span>24/7 Radar</span>
          </div>
        </div>

        {/* Step-by-Step Interactive Guide */}
        <div className="mt-3.5 space-y-2 text-xs">
          <div className="flex items-center gap-2.5 rounded-lg bg-surface-container-low p-2 border border-border-subtle">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[10px] font-bold text-on-primary-fixed">
              1
            </span>
            <span className="text-text-primary">
              Ťuknite na tlačidlo{" "}
              <strong className="text-primary inline-flex items-center gap-1 font-medium bg-surface-pure px-1.5 py-0.5 rounded border border-border-default">
                Zdieľať <Share className="h-3 w-3 text-primary inline" />
              </strong>{" "}
              v spodnej lište Safari.
            </span>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg bg-surface-container-low p-2 border border-border-subtle">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[10px] font-bold text-on-primary-fixed">
              2
            </span>
            <span className="text-text-primary">
              Vyberte možnosť{" "}
              <strong className="text-primary inline-flex items-center gap-1 font-medium bg-surface-pure px-1.5 py-0.5 rounded border border-border-default">
                Pridať na plochu <PlusSquare className="h-3 w-3 text-google-green inline" />
              </strong>
              .
            </span>
          </div>
        </div>

        {/* Action Button & Pointer */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={handleDismiss}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Pripomenúť neskôr
          </button>
          <div className="flex items-center gap-1 text-[11px] font-medium text-primary animate-pulse">
            <span>Sledujte lištu nižšie</span>
            <span className="text-sm">↓</span>
          </div>
        </div>
      </div>
    </div>
  );
}
