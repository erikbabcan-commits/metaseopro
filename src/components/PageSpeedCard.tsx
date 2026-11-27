import { useState } from "react";
import { Gauge, Laptop, RefreshCw, Smartphone, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { runPageSpeedFn } from "@/lib/pagespeed-fn";
import type { PageSpeedReport, PageSpeedStrategy } from "@/lib/pagespeed.server";

interface PageSpeedCardProps {
  domain?: string;
}

function getScoreBadgeClasses(score: number | null): string {
  if (score === null) {
    return "bg-surface-container-low text-text-secondary border-border-subtle";
  }
  if (score >= 90) {
    return "bg-emerald-50 text-google-green border-emerald-200";
  }
  if (score >= 50) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-red-50 text-red-700 border-red-200";
}

function getMetricDotClass(score: number | null): string {
  if (score === null) return "bg-text-secondary/40";
  if (score >= 0.9) return "bg-google-green";
  if (score >= 0.5) return "bg-amber-500";
  return "bg-red-600";
}

export function PageSpeedCard({ domain }: PageSpeedCardProps) {
  const [strategy, setStrategy] = useState<PageSpeedStrategy>("mobile");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PageSpeedReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targetDomain = domain?.trim() ?? "";

  const handleMeasure = async (nextStrategy: PageSpeedStrategy = strategy) => {
    if (!targetDomain) {
      toast.error("Najprv zadajte aspoň jednu doménu na meranie.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await runPageSpeedFn({
        data: { url: targetDomain, strategy: nextStrategy },
      });
      setReport(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Meranie PageSpeed zlyhalo.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleStrategyChange = (next: PageSpeedStrategy) => {
    setStrategy(next);
    if (report && targetDomain) {
      void handleMeasure(next);
    }
  };

  const scoreItems = [
    { label: "Performance", value: report?.scores.performance ?? null },
    { label: "SEO", value: report?.scores.seo ?? null },
    { label: "Accessibility", value: report?.scores.accessibility ?? null },
    { label: "Best Practices", value: report?.scores.bestPractices ?? null },
  ];

  const metricItems = [
    { label: "LCP", metric: report?.metrics.lcp },
    { label: "CLS", metric: report?.metrics.cls },
    { label: "FCP", metric: report?.metrics.fcp },
    { label: "TBT", metric: report?.metrics.tbt },
    { label: "TTFB", metric: report?.metrics.ttfb },
  ];

  return (
    <section
      aria-label="Google PageSpeed Insights a Core Web Vitals"
      className="bg-surface-pure rounded-2xl border border-border-subtle p-4 sm:p-5 shadow-xs space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center shrink-0">
            <Gauge className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-title-md text-sm sm:text-base font-bold text-text-primary truncate">
              PageSpeed Insights &amp; Core Web Vitals
            </h2>
            <p className="text-xs text-text-secondary truncate">
              {targetDomain
                ? `Reálne Lighthouse meranie pre ${targetDomain}`
                : "Zadajte doménu vyššie pre technické meranie rýchlosti"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-full bg-surface-container-low p-0.5 border border-border-subtle">
            <button
              type="button"
              onClick={() => handleStrategyChange("mobile")}
              disabled={loading}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                strategy === "mobile"
                  ? "bg-surface-pure text-text-primary shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Smartphone className="size-3.5" />
              Mobil
            </button>
            <button
              type="button"
              onClick={() => handleStrategyChange("desktop")}
              disabled={loading}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                strategy === "desktop"
                  ? "bg-surface-pure text-text-primary shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Laptop className="size-3.5" />
              Desktop
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleMeasure(strategy)}
            disabled={loading || !targetDomain}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-on-primary text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Meriam (5–15 s)..." : report ? "Zmerať znova" : "Zmerať PageSpeed"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {scoreItems.map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border px-3 py-2.5 flex flex-col items-center justify-center text-center ${getScoreBadgeClasses(item.value)}`}
              >
                <span className="text-xl font-bold tabular-nums">
                  {item.value !== null ? item.value : "—"}
                </span>
                <span className="text-[11px] font-medium mt-0.5">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {metricItems.map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-surface-container-low border border-border-subtle px-3 py-2"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-text-secondary font-medium">
                  <span
                    className={`w-2 h-2 rounded-full ${getMetricDotClass(item.metric?.score ?? null)}`}
                  />
                  {item.label}
                </div>
                <div className="text-sm font-bold text-text-primary mt-0.5 tabular-nums truncate">
                  {item.metric?.displayValue ?? "—"}
                </div>
              </div>
            ))}
          </div>

          {report.opportunities.length > 0 && (
            <div className="rounded-xl bg-surface-container-low border border-border-subtle p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                <Sparkles className="size-3.5 text-primary-container" />
                Top odporúčania na zrýchlenie
              </div>
              <ul className="space-y-1 text-xs text-text-secondary">
                {report.opportunities.map((opp) => (
                  <li key={opp.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{opp.title}</span>
                    {opp.displayValue && (
                      <span className="text-[11px] font-semibold text-text-primary shrink-0">
                        {opp.displayValue}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
