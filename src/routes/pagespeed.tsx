import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  FileText,
  Printer,
  Share2,
  Download,
  Plus,
  Minus,
  Maximize2,
  Grid,
  Check,
  CheckCircle2,
  TrendingUp,
  Wrench,
  Rocket,
  ShieldCheck,
  Search,
  RefreshCw,
  QrCode,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { runPageSpeedFn } from "@/lib/pagespeed-fn";
import type { PageSpeedReport } from "@/lib/pagespeed.server";

export const Route = createFileRoute("/pagespeed")({
  head: () => ({
    meta: [
      { title: "Executive PageSpeed & Core Web Vitals Report — SEO4WEB" },
      {
        name: "description",
        content:
          "Oficiálny technický audit rýchlosti a Core Web Vitals. Porovnanie metrík pred a po optimalizácii, manažérske zhrnutie a PDF export.",
      },
      { property: "og:title", content: "Executive PageSpeed & CWV Report — SEO4WEB" },
      {
        property: "og:description",
        content: "Detailný A4 report Core Web Vitals s možnosťou whitelabel exportu.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PageSpeedReportPage,
});

function PageSpeedReportPage() {
  const [domain, setDomain] = useState("mojeshop.sk");
  const [activePage, setActivePage] = useState<1 | 2>(1);
  const [zoom, setZoom] = useState(100);
  const [whitelabel, setWhitelabel] = useState(true);
  const [loading, setLoading] = useState(false);
  const [liveReport, setLiveReport] = useState<PageSpeedReport | null>(null);

  const [edited, setEdited] = useState(false);
  const [measurementError, setMeasurementError] = useState("");
  const pending = useRef(false);
  const demo = !edited && !liveReport && !loading && !measurementError;
  const reportName = liveReport?.url ?? "ukazkovy-report";
  const canPrint = demo || Boolean(liveReport);

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(prev + delta, 60), 160));
  };

  const handleShare = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Odkaz na nástroj PageSpeed bol skopírovaný do schránky");
      }
    } catch {
      toast.error("Nepodarilo sa skopírovať odkaz");
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleLiveMeasure = async () => {
    if (pending.current) return;
    const trimmed = domain.trim();
    if (!trimmed) {
      toast.error("Zadajte doménu na meranie");
      return;
    }
    pending.current = true;
    setEdited(true);
    setLiveReport(null);
    setMeasurementError("");
    setLoading(true);
    try {
      const result = await runPageSpeedFn({
        data: { url: trimmed, strategy: "mobile" },
      });
      setLiveReport(result);
      toast.success(`Živé dáta načítané pre ${trimmed}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Meranie PageSpeed zlyhalo";
      setMeasurementError(message);
      toast.error(message);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  // Values used only by the two-page demonstration.
  const perfScore = 99;
  const lcpValue = "1.1 s";
  const clsValue = "0.00";
  const tbtValue = "0 ms";

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface">
      <Toaster position="top-right" />
      <AppHeader />

      {/* Sticky Top PDF Controller / Action Bar */}
      <section className="print:hidden sticky top-14 z-30 w-full bg-surface-pure/95 backdrop-blur-md border-b border-border-subtle shadow-xs px-4 sm:px-6 py-2.5">
        <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Document Metadata */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="w-9 h-9 rounded-full bg-red-50 text-google-red flex items-center justify-center shrink-0 border border-red-100">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-sm text-text-primary truncate">
                  Client_Audit_Report_{reportName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf
                </span>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-text-secondary text-[11px] font-medium shrink-0">
                  {demo ? "A4 · 2 strany ukážky" : "A4"}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-google-green"></span>
                {demo
                  ? "Ukážkový report · ilustračné údaje"
                  : liveReport
                    ? "Výsledok merania PageSpeed Insights"
                    : "Čaká na meranie"}
              </p>
            </div>
          </div>

          {/* Viewport / Pagination Controls */}
          <div className="flex items-center justify-center gap-1.5 bg-surface-container-low px-3 py-1 rounded-full border border-border-subtle shadow-xs">
            <button
              type="button"
              onClick={() => handleZoom(-10)}
              aria-label="Zmenšiť náhľad"
              className="size-7 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-container hover:text-text-primary transition-colors cursor-pointer"
              title="Zmenšiť náhľad"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="text-xs font-medium text-text-primary px-2 min-w-[46px] text-center select-none">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={() => handleZoom(10)}
              aria-label="Zväčšiť náhľad"
              className="size-7 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-container hover:text-text-primary transition-colors cursor-pointer"
              title="Zväčšiť náhľad"
            >
              <Plus className="size-3.5" />
            </button>
            <span className="w-px h-4 bg-border-subtle mx-1"></span>
            <div
              hidden={!demo}
              className={demo ? "flex items-center gap-1 text-xs text-text-primary px-1" : "hidden"}
            >
              <span>Strana</span>
              <button
                type="button"
                onClick={() => setActivePage(1)}
                className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                  activePage === 1
                    ? "bg-surface-pure shadow-xs text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                1
              </button>
              <span className="text-text-secondary">/</span>
              <button
                type="button"
                onClick={() => setActivePage(2)}
                className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                  activePage === 2
                    ? "bg-surface-pure shadow-xs text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                2
              </button>
            </div>
            <span className="w-px h-4 bg-border-subtle mx-1"></span>
            <button
              type="button"
              onClick={() => setZoom(100)}
              aria-label="Resetovať zväčšenie"
              className="size-7 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-container hover:text-text-primary transition-colors cursor-pointer"
              title="Reset na 100%"
            >
              <Maximize2 className="size-3.5" />
            </button>
          </div>

          {/* Action Suite & Whitelabel Switch */}
          <div className="flex flex-wrap items-center justify-end gap-2 w-full lg:w-auto">
            {/* Whitelabel Toggle */}
            <label className="flex items-center gap-2 cursor-pointer bg-surface-container-low hover:bg-surface-container px-3 py-1.5 rounded-full border border-border-subtle transition-colors">
              <input
                type="checkbox"
                checked={whitelabel}
                onChange={(e) => setWhitelabel(e.target.checked)}
                className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
              />
              <span className="text-xs font-medium text-text-primary select-none">
                Agentúrny whitelabel
              </span>
            </label>

            {/* Share Link */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-pure hover:bg-surface-container text-primary border border-border-subtle shadow-xs transition-all cursor-pointer"
            >
              <Share2 className="size-3.5" />
              <span className="text-xs font-semibold">Zdieľať odkaz</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={!canPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-pure hover:bg-surface-container text-text-primary border border-border-subtle shadow-xs transition-all cursor-pointer"
            >
              <Printer className="size-3.5" />
              <span className="text-xs font-semibold hidden sm:inline">Tlačiť</span>
            </button>

            {/* Primary Download Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={!canPrint}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-container hover:bg-primary text-white shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <Download className="size-3.5" />
              <span className="text-xs font-bold">Stiahnuť PDF</span>
              <span className="text-[10px] font-semibold bg-white/20 px-1.5 py-0.5 rounded-full">
                Print-Ready
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Input bar for Live PageSpeed Measurement */}
      <section className="print:hidden bg-surface-container-low border-b border-border-subtle px-4 sm:px-6 py-3">
        <div className="max-w-[1240px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="size-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={domain}
                disabled={loading}
                aria-label="Doména alebo URL na meranie"
                onChange={(e) => {
                  setDomain(e.target.value);
                  setEdited(true);
                  setLiveReport(null);
                  setMeasurementError("");
                }}
                placeholder="Zadajte doménu (napr. mojeshop.sk)..."
                className="w-full pl-9 pr-3 py-1.5 rounded-full bg-surface-pure border border-border-subtle text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-container/30"
              />
            </div>
            <button
              type="button"
              onClick={handleLiveMeasure}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-on-primary text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Meriam..." : "Zmerať cez PageSpeed API"}
            </button>
          </div>

          <div className="text-xs text-text-secondary flex items-center gap-2">
            <span>Reálne meranie cez Google PageSpeed Insights v5</span>
            {liveReport && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-google-green text-[10px] font-bold border border-emerald-200">
                <Check className="size-3" /> Živé dáta
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Canvas Workspace Area */}
      <main className="flex-1 w-full bg-surface-container-low/70 py-8 px-4 sm:px-6 flex flex-col items-center overflow-x-auto print:bg-white print:p-0">
        <div
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          className="transition-transform duration-200 flex flex-col items-center gap-8 w-full print:transform-none"
        >
          {liveReport && (
            <article
              className="w-full max-w-[860px] rounded-xl bg-surface-pure p-8"
              aria-label="Výsledok merania"
            >
              <h1 className="font-bold text-xl">Výkonnosť stránky</h1>
              <p>{liveReport.url}</p>
              <p>
                {liveReport.fetchedAt} · {liveReport.strategy}
                {liveReport.cached ? " · z vyrovnávacej pamäte" : ""}
              </p>
              <dl className="my-6 space-y-2">
                {Object.entries({
                  "Lighthouse Performance": liveReport.scores.performance,
                  LCP: liveReport.metrics.lcp.displayValue,
                  CLS: liveReport.metrics.cls.displayValue,
                  TBT: liveReport.metrics.tbt.displayValue,
                  FCP: liveReport.metrics.fcp.displayValue,
                  TTFB: liveReport.metrics.ttfb.displayValue,
                }).map(([label, value]) => (
                  <div key={label}>
                    <dt className="font-semibold">{label}</dt>
                    <dd>{value ?? "Údaj nie je dostupný"}</dd>
                  </div>
                ))}
              </dl>
              {liveReport.opportunities.map((item) => (
                <p key={item.id}>
                  {item.title} {item.displayValue}
                </p>
              ))}
              {!whitelabel && <p>SEO4WEB</p>}
            </article>
          )}
          {!demo && !liveReport && (
            <p role={measurementError ? "alert" : "status"}>
              {measurementError ||
                (loading ? "Prebieha meranie…" : "Spustite meranie zadanej stránky.")}
            </p>
          )}
          {demo && (
            <p className="font-semibold">Ukážkový report pre mojeshop.sk · ilustračné údaje</p>
          )}
          {/* ================= PAGE 1: A4 Paper Sheet ================= */}
          {demo && (activePage === 1 || typeof window !== "undefined") && (
            <div
              id="pagespeed-a4-page-1"
              className={`w-full max-w-[860px] bg-surface-pure rounded-2xl shadow-[0_4px_32px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] p-8 sm:p-12 relative overflow-hidden print:shadow-none print:p-8 print:max-w-none print:w-full print:rounded-none ${
                activePage === 1 ? "block" : "hidden print:block"
              }`}
            >
              {/* Top Google Colors Decorative Ribbon */}
              <div className="absolute top-0 left-0 right-0 h-1.5 flex">
                <div className="h-full w-1/4 bg-[#4285F4]"></div>
                <div className="h-full w-1/4 bg-[#EA4335]"></div>
                <div className="h-full w-1/4 bg-[#FBBC04]"></div>
                <div className="h-full w-1/4 bg-[#34A853]"></div>
              </div>

              {/* Watermark / Header Ribbon */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#4285F4]"></span>
                    <span className="w-3.5 h-3.5 rounded-full bg-[#EA4335]"></span>
                    <span className="w-3.5 h-3.5 rounded-full bg-[#FBBC04]"></span>
                    <span className="w-3.5 h-3.5 rounded-full bg-[#34A853]"></span>
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-text-primary tracking-tight">
                      {whitelabel ? "Výkonnostný audit" : "Seo4web"}{" "}
                      <span className="text-xs text-text-secondary font-normal uppercase tracking-wider">
                        Engine v12.1
                      </span>
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-google-green text-[10px] font-semibold mt-0.5 border border-emerald-100">
                      <ShieldCheck className="size-3" />
                      Oficiálny technický audit rýchlosti &amp; Core Web Vitals
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary font-medium">
                    Klient &amp; Projekt
                  </p>
                  <p className="text-sm font-bold text-text-primary">
                    mojeshop.sk · ukážkové údaje
                  </p>
                  <div className="flex items-center justify-end gap-2 text-text-secondary text-xs mt-0.5">
                    <span>Dnes</span>
                    <span>•</span>
                    <span className="font-mono bg-surface-container px-1.5 py-0.5 rounded text-[10px] text-text-primary font-semibold">
                      #CWV-9942-SK
                    </span>
                  </div>
                </div>
              </div>

              {/* Executive Summary Card (High Impact) */}
              <div className="bg-surface-container-low rounded-xl p-5 mb-6 relative overflow-hidden border border-border-subtle">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-primary-container text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Rocket className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase tracking-wider text-primary font-bold">
                        Audit výsledkov &amp; Akcelerácia
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      <span className="text-[11px] text-text-secondary">Metodika Google CrUX</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-text-primary mt-1">
                      Manažérske zhrnutie: Optimalizácia rýchlosti cez modul SEO Raketa
                    </h2>
                    <div className="mt-3 p-3.5 rounded-lg bg-surface-pure shadow-xs flex items-center gap-3.5 border border-border-subtle">
                      <div className="w-2 h-10 rounded-full bg-google-green shrink-0"></div>
                      <p className="text-xs sm:text-sm text-text-primary leading-relaxed">
                        <span className="font-semibold text-google-green">
                          Celkové zrýchlenie načítania o 61%
                        </span>{" "}
                        (z 1.8 s na {lcpValue}),{" "}
                        <span className="font-semibold text-primary">
                          zníženie blokovania JavaScriptu o 100%
                        </span>{" "}
                        a nárast celkového Lighthouse skóre na{" "}
                        <span className="font-bold text-google-green">{perfScore} / 100 bodov</span>
                        . Stránka prešla všetkými metrikami Core Web Vitals na desktopových aj
                        mobilných zariadeniach.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Scoreboard "Pred vs. Po" */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-text-primary">
                      Porovnanie metrík: Pred vs. Po optimalizácii
                    </h3>
                    <p className="text-xs text-text-secondary">
                      Laboratórne meranie pri mobilnom profile 4G throttled &amp; Chrome DevTools
                      v12.1
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-text-secondary font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-surface-dim"></span> Pred
                    </span>
                    <span className="flex items-center gap-1.5 text-text-primary font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-google-green"></span> Po
                      (Optimalizované)
                    </span>
                  </div>
                </div>

                {/* 6-Metric High Contrast Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Metric 1: Lighthouse Score */}
                  <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col justify-between border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary">
                        Lighthouse Performance
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-google-green text-[10px] font-bold border border-emerald-100">
                        +{Math.max(perfScore - 92, 0)} bodov
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-2.5">
                      <div>
                        <span className="text-[10px] text-text-secondary block">Pôvodne</span>
                        <span className="text-xs text-text-secondary line-through font-medium">
                          92 / 100
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-google-green font-bold block">
                          Výsledok
                        </span>
                        <span className="text-xl font-bold text-google-green">
                          {perfScore}
                          <span className="text-xs font-normal">/100</span>
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="bg-google-green h-full rounded-full transition-all duration-500"
                        style={{ width: `${perfScore}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-text-secondary mt-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-google-green"></span> Zelené
                      pásmo (Optimal)
                    </span>
                  </div>

                  {/* Metric 2: LCP */}
                  <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col justify-between border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary">
                        LCP (Largest Contentful)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-google-green text-[10px] font-bold border border-emerald-100">
                        -39% rýchlejšie
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-2.5">
                      <div>
                        <span className="text-[10px] text-text-secondary block">Pôvodne</span>
                        <span className="text-xs text-text-secondary line-through font-medium">
                          1.8 s
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-google-green font-bold block">
                          Výsledok
                        </span>
                        <span className="text-xl font-bold text-google-green">{lcpValue}</span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="bg-google-green h-full rounded-full"
                        style={{ width: "88%" }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-text-secondary mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-google-green" /> Hranica Pass &lt; 2.5 s
                    </span>
                  </div>

                  {/* Metric 3: INP */}
                  <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col justify-between border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary">
                        INP (Interaction Next Paint)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-google-green text-[10px] font-bold border border-emerald-100">
                        -45% latencia
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-2.5">
                      <div>
                        <span className="text-[10px] text-text-secondary block">Pôvodne</span>
                        <span className="text-xs text-text-secondary line-through font-medium">
                          142 ms
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-google-green font-bold block">
                          Výsledok
                        </span>
                        <span className="text-xl font-bold text-google-green">78 ms</span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="bg-google-green h-full rounded-full"
                        style={{ width: "92%" }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-text-secondary mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-google-green" /> Rýchla reakcia &lt; 200
                      ms
                    </span>
                  </div>

                  {/* Metric 4: CLS */}
                  <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col justify-between border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary">
                        CLS (Layout Shift)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-google-green text-[10px] font-bold border border-emerald-100">
                        100% stabilita
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-2.5">
                      <div>
                        <span className="text-[10px] text-text-secondary block">Pôvodne</span>
                        <span className="text-xs text-text-secondary line-through font-medium">
                          0.04
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-google-green font-bold block">
                          Výsledok
                        </span>
                        <span className="text-xl font-bold text-google-green">{clsValue}</span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="bg-google-green h-full rounded-full"
                        style={{ width: "100%" }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-text-secondary mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-google-green" /> Nulový posun prvkov
                    </span>
                  </div>

                  {/* Metric 5: TBT */}
                  <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col justify-between border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary">
                        TBT (Total Blocking Time)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-google-green text-[10px] font-bold border border-emerald-100">
                        -100% stopka
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-2.5">
                      <div>
                        <span className="text-[10px] text-text-secondary block">Pôvodne</span>
                        <span className="text-xs text-text-secondary line-through font-medium">
                          80 ms
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-google-green font-bold block">
                          Výsledok
                        </span>
                        <span className="text-xl font-bold text-google-green">{tbtValue}</span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="bg-google-green h-full rounded-full"
                        style={{ width: "100%" }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-text-secondary mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-google-green" /> Nulové blokovanie vlákna
                    </span>
                  </div>

                  {/* Metric 6: Data Transfer Size */}
                  <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col justify-between border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary">
                        Prenos dát (Payload)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-google-green text-[10px] font-bold border border-emerald-100">
                        -45% úspora
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-2.5">
                      <div>
                        <span className="text-[10px] text-text-secondary block">Pôvodne</span>
                        <span className="text-xs text-text-secondary line-through font-medium">
                          1.42 MB
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-google-green font-bold block">
                          Výsledok
                        </span>
                        <span className="text-xl font-bold text-google-green">0.78 MB</span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="bg-google-green h-full rounded-full"
                        style={{ width: "75%" }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-text-secondary mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-google-green" /> Šetrenie mobilných dát
                    </span>
                  </div>
                </div>
              </div>

              {/* Two-Column Section: Technical Actions & Business Impact */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
                {/* Left: Technical Actions Executed (7 cols) */}
                <div className="lg:col-span-7 bg-surface-container-low rounded-xl p-5 border border-border-subtle">
                  <div className="flex items-center gap-2 mb-3.5">
                    <Wrench className="size-4 text-primary" />
                    <h3 className="text-xs sm:text-sm font-bold text-text-primary">
                      Vykonané technické zásahy
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-google-green flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="size-3" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-text-primary block">
                          Generovanie kritického CSS inline
                        </span>
                        <span className="text-[11px] text-text-secondary leading-snug block">
                          Above-The-Fold rendering štýlov bez oneskorenia blokujúcimi sieťovými
                          požiadavkami.
                        </span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-google-green flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="size-3" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-text-primary block">
                          Konverzia a servovanie grafiky v AVIF / WebP
                        </span>
                        <span className="text-[11px] text-text-secondary leading-snug block">
                          Adaptívne rozlíšenie podľa zariadenia so zachovaním retinálnej ostrosti a
                          62% úsporou.
                        </span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-google-green flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="size-3" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-text-primary block">
                          Odloženie (defer / async) nepoužívaného JavaScriptu
                        </span>
                        <span className="text-[11px] text-text-secondary leading-snug block">
                          Inteligentná orchestrácia Google Tag Manager, Meta Pixel a analytických
                          skriptov.
                        </span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-google-green flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="size-3" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-text-primary block">
                          Optimalizácia DOM stromu a aktivácia Edge CDN cache
                        </span>
                        <span className="text-[11px] text-text-secondary leading-snug block">
                          Kompresia Brotli Level 11 a servovanie zo slovenského edge uzla s
                          latenciou pod 14 ms.
                        </span>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Right: Business Impact Projection (5 cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="size-4 text-google-green" />
                    <h3 className="text-xs sm:text-sm font-bold text-text-primary">
                      Biznisový &amp; SEO dopad
                    </h3>
                  </div>

                  <div className="bg-surface-pure rounded-xl p-3 shadow-xs border border-border-subtle">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold text-text-secondary uppercase">
                        Konverzie e-shopu
                      </span>
                      <span className="text-sm font-bold text-google-green">+8.4%</span>
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      Odhadovaný nárast konverzného pomeru (každých 100 ms zrýchlenia priamo zvyšuje
                      obrat košíka).
                    </p>
                  </div>

                  <div className="bg-surface-pure rounded-xl p-3 shadow-xs border border-border-subtle">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold text-text-secondary uppercase">
                        Miera odchodov
                      </span>
                      <span className="text-sm font-bold text-primary">-14.2%</span>
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      Zníženie okamžitých odchodov (Bounce Rate) najmä pri návštevníkoch z mobilných
                      PPC kampaní.
                    </p>
                  </div>

                  <div className="bg-surface-pure rounded-xl p-3 shadow-xs border border-border-subtle">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold text-text-secondary uppercase">
                        Google Page Experience
                      </span>
                      <span className="text-sm font-bold text-google-green">100% Splnené</span>
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      Získaná trvalá organická výhoda v SEO vyhľadávaní Google voči pomalšej
                      konkurencii.
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Footer / Verification Block */}
              <div className="pt-4 mt-4 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-container rounded-lg p-1.5 flex items-center justify-center shrink-0 border border-border-subtle">
                    <QrCode className="size-7 text-text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-text-secondary leading-tight">
                      Kryptograficky overené systémom{" "}
                      <span className="font-semibold text-text-primary">
                        {whitelabel ? "Lighthouse Report Engine v12.1" : "Seo4web Engine v12.1"}
                      </span>
                      <br />v súlade s medzinárodnými štandardmi Google Chrome CrUX &amp; W3C.
                    </p>
                    <p className="text-[10px] text-primary mt-0.5">
                      https://seo4web.sk/verify/CWV-9942-SK
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container text-text-primary text-[11px] font-mono font-semibold">
                    <span>Strana 1 z 2</span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-0.5">
                    Dôverný audit pre klienta
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================= PAGE 2: Secondary Page (A4) ================= */}
          {demo && (activePage === 2 || typeof window !== "undefined") && (
            <div
              id="pagespeed-a4-page-2"
              className={`w-full max-w-[860px] bg-surface-pure rounded-2xl shadow-[0_4px_32px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] p-8 sm:p-12 relative overflow-hidden print:shadow-none print:p-8 print:max-w-none print:w-full print:rounded-none ${
                activePage === 2 ? "block" : "hidden print:block"
              }`}
            >
              {/* Top Google Colors Decorative Ribbon */}
              <div className="absolute top-0 left-0 right-0 h-1.5 flex">
                <div className="h-full w-1/4 bg-[#4285F4]"></div>
                <div className="h-full w-1/4 bg-[#EA4335]"></div>
                <div className="h-full w-1/4 bg-[#FBBC04]"></div>
                <div className="h-full w-1/4 bg-[#34A853]"></div>
              </div>

              <div className="flex items-center justify-between pb-6 mb-6 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-text-primary">
                    Strana 2: Detailný rozbor zdrojového kódu a Waterfall analýza
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container text-text-primary text-[11px] font-mono font-semibold">
                  <span>Strana 2 z 2</span>
                </div>
              </div>

              <div className="space-y-4 text-xs text-text-secondary">
                <div className="bg-surface-container-low rounded-xl p-4 border border-border-subtle">
                  <h4 className="text-xs font-bold text-text-primary mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-google-green" />
                    Top odporúčania a dosiahnutá úspora
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex justify-between items-center py-1 border-b border-border-subtle">
                      <span>Eliminácia render-blocking zdrojov (CSS/JS)</span>
                      <span className="font-semibold text-google-green">-450 ms</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-border-subtle">
                      <span>Správne dimenzovanie a formát obrázkov (WebP/AVIF)</span>
                      <span className="font-semibold text-google-green">-380 KB</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-border-subtle">
                      <span>Efektívna cache politika statických assetov (max-age 1y)</span>
                      <span className="font-semibold text-google-green">100% Hit Rate</span>
                    </li>
                    <li className="flex justify-between items-center py-1">
                      <span>Zníženie času odozvy servera (TTFB) cez Edge CDN</span>
                      <span className="font-semibold text-google-green">&lt; 14 ms</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-surface-container-low rounded-xl p-4 border border-border-subtle">
                  <h4 className="text-xs font-bold text-text-primary mb-2">
                    Metodika merania a technické prostredie
                  </h4>
                  <p className="leading-relaxed">
                    Test bol realizovaný v prostredí Google Lighthouse v12.1 s emuláciou mobilného
                    zariadenia Moto G Power (throttled 4G, 1.6 Mbps down / 750 Kbps up, 150 ms RTT).
                    Všetky metriky boli validované voči odporúčaným prahom Google Core Web Vitals
                    (LCP &lt; 2.5s, INP &lt; 200ms, CLS &lt; 0.1).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Secondary Page Teaser (A4 Preview Stacking Effect on Desktop) */}
          {demo && (
            <div className="print:hidden w-full max-w-[830px] bg-surface-pure rounded-xl border border-border-subtle shadow-xs p-4 flex items-center justify-between opacity-90 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-surface-container text-text-primary font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <div>
                  <p className="text-xs font-bold text-text-primary">
                    Strana 2: Detailný rozbor zdrojového kódu a Waterfall analýza
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    Obsahuje zoznam 18 optimalizovaných multimédií a zhrnutie TTFB pre 8 svetových
                    regiónov.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePage(activePage === 1 ? 2 : 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-text-primary text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>{activePage === 1 ? "Otvoriť stranu 2" : "Späť na stranu 1"}</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Print-specific style */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          #pagespeed-a4-page-1,
          #pagespeed-a4-page-2 {
            page-break-after: always;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
