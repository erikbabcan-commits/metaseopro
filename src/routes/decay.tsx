import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Minus,
  PenTool,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  TrendingDown,
  X,
  Zap,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/use-auth";
import { streamSSE } from "@/lib/stream-sse";
import { startLaserProgress, stopLaserProgress } from "@/lib/laser-loader";
import { handoffToWriter } from "@/lib/refresh-handoff";
import { saveOutput } from "@/lib/outputs.functions";
import { supabase } from "@/integrations/supabase/client";
import { PaywallModal } from "@/components/PaywallModal";
import { useViewerRole } from "@/hooks/use-viewer-role";
import {
  DECAY_LANGUAGES,
  DECAY_SCENARIOS,
  LANGUAGE_LABEL,
  SCENARIO_LABEL,
  STATUS_LABEL,
  type DecayDataset,
  type DecayLanguage,
  type DecayScenario,
  type DecayStatus,
  type ScoredDecayRow,
} from "@/lib/decay-schema";
import { PRICE_LINE_LABEL, TRIAL_LABEL } from "@/lib/pricing-proposal";

export const Route = createFileRoute("/decay")({
  head: () => ({
    meta: [
      { title: "Decay Radar — nájdi klesajúci obsah | SEO4WEB" },
      {
        name: "description",
        content:
          "Odhaľ stránky, ktoré strácajú organický traffic. Decay Radar analyzuje pokles kliknutí a pozícií a vygeneruje AI refresh plán. Funguje aj v demo režime.",
      },
      { property: "og:title", content: "Decay Radar — nájdi klesajúci obsah" },
      {
        property: "og:description",
        content: "Odhaľ stránky, ktoré strácajú organický traffic, a získaj AI refresh plán.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DecayPage,
});

type Phase = "idle" | "analyzing" | "ready" | "error";
type FilterType = "all" | "critical" | "warning" | "minor";

function buildMarkdown(dataset: DecayDataset, row: ScoredDecayRow, plan: string) {
  const header = [
    `# Decay Radar — refresh plán`,
    ``,
    dataset.demo
      ? `> ⚠️ Analýza je založená na **demo dátach** (${dataset.scenarioLabel}). Pripoj Google Search Console pre reálnu analýzu.`
      : `> Analýza pre ${dataset.siteUrl}`,
    ``,
    `**URL:** ${row.url}`,
    `**Kliknutia:** ${row.clicksPrev} → ${row.clicksNow} (${row.clicksDeltaPct}%)`,
    `**Priemerná pozícia:** ${row.positionPrev.toFixed(1)} → ${row.positionNow.toFixed(1)}`,
    `**Decay skóre:** ${row.decayScore}/100`,
    ``,
    `---`,
    ``,
  ].join("\n");
  return header + plan;
}

function DecayPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const save = useServerFn(saveOutput);

  const [scenario, setScenario] = useState<DecayScenario>("blog");
  const [language, setLanguage] = useState<DecayLanguage>("sk");
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [gscStatus, setGscStatus] = useState<"loading" | "ok" | "unavailable">("loading");
  const [properties, setProperties] = useState<string[]>([]);
  const [siteUrl, setSiteUrl] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dataset, setDataset] = useState<DecayDataset | null>(null);
  const [selected, setSelected] = useState<ScoredDecayRow | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [plan, setPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { isAdmin } = useViewerRole();

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { redirect: "/decay" } });
  }, [user, loading, navigate]);

  // Load verified Search Console properties
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch("/api/decay-gsc-properties", {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const list: string[] = (json.properties ?? []).map((p: { siteUrl: string }) => p.siteUrl);
        if (res.ok && json.status === "ok" && list.length > 0) {
          setProperties(list);
          setSiteUrl((current) => (list.includes(current) ? current : (list[0] ?? "")));
          setGscStatus("ok");
        } else {
          setGscStatus("unavailable");
        }
      } catch {
        if (!cancelled) setGscStatus("unavailable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Restore the latest saved live snapshot so results survive a refresh
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("seo_snapshots")
        .select("raw_data")
        .eq("type", "decay")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data?.raw_data) return;
      const restored = data.raw_data as unknown as DecayDataset;
      setDataset((prev) => prev ?? restored);
      if (!restored.demo) {
        setMode("live");
        setSiteUrl(restored.siteUrl);
      }
      setPhase((p) => (p === "idle" ? "ready" : p));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const analyze = async () => {
    setPhase("analyzing");
    setErrorMsg("");
    setDataset(null);
    setSelected(null);
    setPlan("");
    startLaserProgress();
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch("/api/decay-analyze", {
        method: "POST",
        headers,
        body: JSON.stringify(
          mode === "live" ? { mode, scenario, siteUrl } : { mode: "demo", scenario },
        ),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Analýza zlyhala.");
      }
      const json = await res.json();
      const receivedDataset = json.dataset as DecayDataset;
      setDataset(receivedDataset);
      if (receivedDataset.rows.length > 0) {
        setSelected(receivedDataset.rows[0]);
      }
      setPhase("ready");
    } catch (e) {
      setErrorMsg((e as Error).message || "Analýza zlyhala.");
      setPhase("error");
    } finally {
      stopLaserProgress();
    }
  };

  const openRow = (row: ScoredDecayRow) => {
    setSelected(row);
    setPlan("");
  };

  const stopPlan = () => {
    abortRef.current?.abort();
    setPlanLoading(false);
  };

  const generatePlan = async () => {
    if (!dataset || !selected) return;
    const rowIndex = dataset.rows.findIndex((r) => r.url === selected.url);
    if (rowIndex >= 3 && !isAdmin) {
      setPaywallOpen(true);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPlan("");
    setPlanLoading(true);

    let buffer = "";
    let raf = 0;
    const flush = () => {
      raf = 0;
      setPlan(buffer);
    };

    await streamSSE({
      url: "/api/decay-generate-plan",
      body: {
        demo: dataset.demo,
        scenario: dataset.scenario,
        language,
        siteUrl: dataset.siteUrl,
        row: selected,
      },
      signal: controller.signal,
      onDelta: (chunk) => {
        buffer += chunk;
        if (!raf) raf = requestAnimationFrame(flush);
      },
      onDone: async () => {
        if (raf) cancelAnimationFrame(raf);
        setPlan(buffer);
        setPlanLoading(false);
        try {
          await save({
            data: {
              type: "decay",
              title: `Decay refresh${dataset.demo ? " (demo)" : ""}: ${selected.url}`.slice(0, 300),
              input: {
                demo: dataset.demo,
                scenario: dataset.scenario,
                siteUrl: dataset.siteUrl,
                url: selected.url,
                language,
              },
              output_markdown: buildMarkdown(dataset, selected, buffer),
            },
          });
        } catch (e) {
          console.error("save decay output:", e);
        }
      },
      onError: (msg) => {
        if (raf) cancelAnimationFrame(raf);
        setPlanLoading(false);
        if (buffer) {
          setPlan(buffer);
          toast.error(msg);
        } else {
          toast.error(msg);
        }
      },
    });
  };

  const copyPlan = async () => {
    if (!plan) return;
    await navigator.clipboard.writeText(plan);
    setCopied(true);
    toast.success("Plán skopírovaný do schránky");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPlan = () => {
    if (!dataset || !selected || !plan) return;
    const md = buildMarkdown(dataset, selected, plan);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decay-plan-${selected.url.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendToWriter = () => {
    if (!dataset || !selected) return;
    handoffToWriter(dataset.siteUrl, selected);
    navigate({ to: "/plan" });
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!dataset) return [];
    return dataset.rows.filter((r) => {
      if (searchQuery.trim() && !r.url.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filter === "critical") return r.status === "critical";
      if (filter === "warning") return r.status === "declining";
      if (filter === "minor") return r.status === "stable" || r.clicksDeltaPct < 0;
      return true;
    });
  }, [dataset, filter, searchQuery]);

  // Aggregate metrics
  const totalLostClicks = useMemo(() => {
    if (!dataset) return 4820;
    return Math.abs(
      dataset.rows.reduce((acc, r) => {
        const delta = r.clicksNow - r.clicksPrev;
        return acc + (delta < 0 ? delta : 0);
      }, 0),
    );
  }, [dataset]);

  const criticalPagesCount = useMemo(() => {
    if (!dataset) return 3;
    return dataset.rows.filter((r) => r.status === "critical").length;
  }, [dataset]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed-variant">
      <Toaster />
      <AppHeader />

      {/* Google 4-Color Accent Strip */}
      <div className="h-1 w-full flex shrink-0">
        <div className="h-full w-1/4 bg-google-blue-bright"></div>
        <div className="h-full w-1/4 bg-google-red"></div>
        <div className="h-full w-1/4 bg-google-yellow"></div>
        <div className="h-full w-1/4 bg-google-green"></div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-28 md:pb-16 space-y-6">
        {/* Header Title & Mode Controls */}
        <section className="bg-surface-pure rounded-2xl p-4 sm:p-5 shadow-xs border border-border-subtle flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-google-red/10 flex items-center justify-center text-google-red shrink-0">
              <TrendingDown className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline-sm text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                  Content Decay Radar
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-google-red/10 text-google-red font-label-sm text-label-sm font-bold">
                  Live Scanner
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                Detekcia klesajúceho organického trafficu a okamžitý AI plán na obnovu pozícií.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex rounded-full bg-surface-container-low p-1 border border-border-subtle">
              <button
                type="button"
                onClick={() => setMode("demo")}
                className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-medium transition-all ${
                  mode === "demo"
                    ? "bg-surface-pure text-text-primary shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Demo režim
              </button>
              <button
                type="button"
                onClick={() => setMode("live")}
                className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-medium transition-all ${
                  mode === "live"
                    ? "bg-surface-pure text-text-primary shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Reálne GSC dáta
              </button>
            </div>

            {mode === "demo" ? (
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value as DecayScenario)}
                className="h-10 px-3.5 rounded-full bg-surface-pure border border-border-subtle text-text-primary font-body-sm text-body-sm focus:outline-none cursor-pointer"
              >
                {DECAY_SCENARIOS.map((s) => (
                  <option key={s} value={s}>
                    {SCENARIO_LABEL[s]}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                className="h-10 px-3.5 rounded-full bg-surface-pure border border-border-subtle text-text-primary font-body-sm text-body-sm focus:outline-none cursor-pointer"
              >
                {properties.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="studio"
              onClick={analyze}
              disabled={phase === "analyzing"}
              className="h-10 px-5 rounded-full font-label-lg text-label-lg font-bold bg-primary-container hover:bg-primary text-white flex items-center gap-2 shadow-xs active:scale-[0.98] transition-all"
            >
              <Sparkles className="size-4" />
              <span>{phase === "analyzing" ? "Analyzujem..." : "Spustiť radar"}</span>
            </Button>
          </div>
        </section>

        {/* 4 KPI Dashboard Tiles */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-surface-pure p-4 rounded-2xl border border-border-subtle shadow-xs flex flex-col justify-between">
            <span className="font-label-sm text-label-sm text-text-secondary font-medium uppercase tracking-wider">
              Stratené kliky / mesiac
            </span>
            <div className="my-2">
              <span className="font-display text-2xl sm:text-3xl font-extrabold text-google-red tracking-tight">
                -{totalLostClicks.toLocaleString("sk-SK")}
              </span>
              <p className="font-body-sm text-xs text-text-secondary mt-0.5">
                pokles organických návštev
              </p>
            </div>
            <div className="pt-2 border-t border-border-subtle font-label-sm text-xs font-semibold text-text-primary">
              ~2 890 € hodnota v Google Ads
            </div>
          </div>

          <div className="bg-surface-pure p-4 rounded-2xl border border-border-subtle shadow-xs flex flex-col justify-between">
            <span className="font-label-sm text-label-sm text-text-secondary font-medium uppercase tracking-wider">
              Ohrozené stránky
            </span>
            <div className="my-2">
              <span className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                {dataset ? dataset.rows.length : 7} stránok
              </span>
              <p className="font-body-sm text-xs text-google-red font-medium mt-0.5">
                {criticalPagesCount} kritické prepady
              </p>
            </div>
            <div className="pt-2 border-t border-border-subtle font-label-sm text-xs text-text-secondary">
              4 v zóne varovania
            </div>
          </div>

          <div className="bg-surface-pure p-4 rounded-2xl border border-border-subtle shadow-xs flex flex-col justify-between">
            <span className="font-label-sm text-label-sm text-text-secondary font-medium uppercase tracking-wider">
              Priemerný prepad pozície
            </span>
            <div className="my-2">
              <span className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                -4.2 poz.
              </span>
              <p className="font-body-sm text-xs text-text-secondary mt-0.5">
                predtým: <strong className="text-google-green">#3.4</strong>
              </p>
            </div>
            <div className="pt-2 border-t border-border-subtle font-label-sm text-xs text-text-secondary">
              aktuálne v SERP: <strong className="text-google-red">#7.6</strong>
            </div>
          </div>

          <div className="bg-surface-pure p-4 rounded-2xl border border-border-subtle shadow-xs flex flex-col justify-between">
            <span className="font-label-sm text-label-sm text-text-secondary font-medium uppercase tracking-wider">
              Úspešnosť obnovy
            </span>
            <div className="my-2">
              <span className="font-display text-2xl sm:text-3xl font-extrabold text-google-green tracking-tight">
                91.4%
              </span>
              <p className="font-body-sm text-xs text-text-secondary mt-0.5">
                návratnosť do TOP 3 po refreshi
              </p>
            </div>
            <div className="pt-2 border-t border-border-subtle font-label-sm text-xs text-text-primary font-semibold">
              priemerný čas záchrany: 14 dní
            </div>
          </div>
        </section>

        {/* Filter Chipy & Vyhľadávanie */}
        <section className="bg-surface-pure rounded-xl p-3 sm:p-3.5 border border-border-subtle shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full font-label-md text-label-md font-medium shrink-0 transition-colors ${
                filter === "all"
                  ? "bg-text-primary text-white"
                  : "bg-surface-container-low text-text-secondary hover:text-text-primary"
              }`}
            >
              Všetky ({dataset ? dataset.rows.length : 0})
            </button>
            <button
              type="button"
              onClick={() => setFilter("critical")}
              className={`px-3 py-1.5 rounded-full font-label-md text-label-md font-medium shrink-0 transition-colors flex items-center gap-1.5 ${
                filter === "critical"
                  ? "bg-google-red text-white"
                  : "bg-surface-container-low text-google-red hover:bg-google-red/10"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-google-red"></span>
              Kritické prepady
            </button>
            <button
              type="button"
              onClick={() => setFilter("warning")}
              className={`px-3 py-1.5 rounded-full font-label-md text-label-md font-medium shrink-0 transition-colors flex items-center gap-1.5 ${
                filter === "warning"
                  ? "bg-google-yellow text-text-primary"
                  : "bg-surface-container-low text-text-secondary hover:text-text-primary"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-google-yellow"></span>
              Varovania
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="size-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrovať URL..."
              className="w-full h-9 pl-9 pr-3 rounded-full bg-surface-container-low border border-border-subtle text-text-primary font-body-sm text-body-sm focus:outline-none placeholder:text-text-secondary/60"
            />
          </div>
        </section>

        {/* Empty / Error state */}
        {phase === "idle" && (
          <div className="bg-surface-pure rounded-2xl p-8 sm:p-12 text-center border border-border-subtle shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary-container/10 text-primary-container mx-auto flex items-center justify-center">
              <Activity className="size-6" />
            </div>
            <h3 className="font-headline-sm text-lg font-bold text-text-primary">
              Pripravené na analýzu
            </h3>
            <p className="font-body-sm text-body-sm text-text-secondary max-w-md mx-auto">
              Kliknite na tlačidlo <strong>„Spustiť radar“</strong> a algoritmus okamžite vyhodnotí
              najviac ohrozené podstránky s najväčšou stratou organických kliknutí.
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="bg-error-container/40 p-4 rounded-xl border border-red-200 text-google-red flex items-center gap-3">
            <AlertTriangle className="size-5 shrink-0" />
            <span className="font-body-sm text-body-sm font-medium">{errorMsg}</span>
          </div>
        )}

        {/* 2-Column Desktop Studio & Mobile Cards */}
        {dataset && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: URL List (prevzdušnené karty) */}
            <div className="lg:col-span-5 space-y-3">
              <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-semibold block px-1">
                Zoznam klesajúcich stránok ({filteredRows.length})
              </span>

              {filteredRows.length === 0 ? (
                <div className="bg-surface-pure rounded-xl p-6 text-center text-text-secondary font-body-sm text-sm border border-border-subtle">
                  Žiadne stránky nevyhovujú filtru.
                </div>
              ) : (
                filteredRows.map((row) => {
                  const isSelected = selected?.url === row.url;
                  const isCrit = row.status === "critical";

                  return (
                    <div
                      key={row.url}
                      onClick={() => openRow(row)}
                      className={`p-4 rounded-2xl bg-surface-pure border transition-all cursor-pointer relative overflow-hidden shadow-xs hover:border-primary-container/50 ${
                        isSelected
                          ? "ring-2 ring-primary-container border-transparent"
                          : "border-border-subtle"
                      }`}
                    >
                      {/* Left severity indicator line */}
                      <div
                        className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                          isCrit ? "bg-google-red" : "bg-google-yellow"
                        }`}
                      />

                      <div className="pl-2">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className={`font-label-sm text-xs font-bold uppercase tracking-wider ${
                              isCrit ? "text-google-red" : "text-google-yellow"
                            }`}
                          >
                            {isCrit ? "Kritický prepad" : "Varovanie"}
                          </span>
                          <span className="font-label-sm text-xs text-text-secondary font-mono">
                            Decay: {row.decayScore}/100
                          </span>
                        </div>

                        <p className="font-body-md text-sm font-semibold text-text-primary break-all leading-snug">
                          {row.url}
                        </p>

                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-border-subtle text-xs">
                          <div>
                            <span className="text-text-secondary block">Kliky:</span>
                            <span className="font-bold text-google-red flex items-center gap-0.5">
                              <ArrowDownRight className="size-3" />
                              {row.clicksDeltaPct}% ({row.clicksPrev} → {row.clicksNow})
                            </span>
                          </div>
                          <div>
                            <span className="text-text-secondary block">Pozícia:</span>
                            <span className="font-bold text-text-primary">
                              #{row.positionPrev.toFixed(1)} → #{row.positionNow.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        {row.topQueries.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-border-subtle">
                            {row.topQueries.slice(0, 3).map((q) => (
                              <span
                                key={q.query}
                                className="px-2 py-0.5 rounded-full bg-surface-container-low text-[11px] font-medium text-text-secondary"
                              >
                                {q.query}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Detail & AI Rescue Plan Generator */}
            <div className="lg:col-span-7 space-y-4">
              {selected ? (
                <div className="bg-surface-pure rounded-2xl p-5 sm:p-6 shadow-xs border border-border-subtle space-y-6 sticky top-20">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border-subtle">
                    <div>
                      <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-semibold">
                        Detail vybranej URL
                      </span>
                      <h3 className="font-headline-sm text-base sm:text-lg font-bold text-text-primary break-all">
                        {selected.url}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {planLoading ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={stopPlan}
                          className="rounded-full h-9 px-4 text-xs font-bold"
                        >
                          <Square className="size-3.5 mr-1" /> Zastaviť
                        </Button>
                      ) : (
                        <Button
                          variant="studio"
                          size="sm"
                          onClick={generatePlan}
                          className="rounded-full h-9 px-4 text-xs font-bold bg-primary-container text-white hover:bg-primary shadow-xs"
                        >
                          <Sparkles className="size-3.5 mr-1" />
                          <span>{plan ? "Znovu vygenerovať" : "Vygenerovať plán"}</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Top Keyword Opportunities for Selected URL */}
                  <div>
                    <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-semibold block mb-2">
                      Zasiahnuté kľúčové slová & Pokles
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selected.topQueries.map((q) => {
                        const posDelta = q.positionNow - q.positionPrev;
                        return (
                          <div
                            key={q.query}
                            className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle flex items-center justify-between text-xs"
                          >
                            <span className="font-medium text-text-primary truncate mr-2">
                              {q.query}
                            </span>
                            <span
                              className={`font-bold shrink-0 ${posDelta > 0 ? "text-google-red" : "text-google-green"}`}
                            >
                              {posDelta > 0
                                ? `-${posDelta.toFixed(1)}`
                                : `+${Math.abs(posDelta).toFixed(1)}`}{" "}
                              pozícií
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Rescue Plan Output */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-semibold">
                        AI Záchranný plán & Odporúčania
                      </span>
                      {plan && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={copyPlan}
                            className="h-8 px-2.5 text-xs text-text-secondary hover:text-text-primary"
                          >
                            <Copy className="size-3.5 mr-1" />
                            {copied ? "Skopírované" : "Kopírovať"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={downloadPlan}
                            className="h-8 px-2.5 text-xs text-text-secondary hover:text-text-primary"
                          >
                            <ArrowDown className="size-3.5 mr-1" /> .md
                          </Button>
                        </div>
                      )}
                    </div>

                    {planLoading && !plan && (
                      <div className="space-y-3 p-4 rounded-xl bg-surface-container-low">
                        <div className="h-4 w-1/3 animate-pulse rounded bg-surface-container" />
                        <div className="h-4 w-full animate-pulse rounded bg-surface-container" />
                        <div className="h-4 w-5/6 animate-pulse rounded bg-surface-container" />
                      </div>
                    )}

                    {plan ? (
                      <article className="prose prose-neutral max-w-none p-4 rounded-xl bg-surface-container-low border border-border-subtle prose-headings:font-sans prose-h2:text-base prose-h2:font-bold prose-h2:mt-4 prose-p:text-text-secondary prose-p:text-sm prose-strong:text-text-primary">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan}</ReactMarkdown>
                      </article>
                    ) : !planLoading ? (
                      <div className="p-6 rounded-xl bg-surface-container-low text-center border border-border-subtle space-y-2">
                        <PenTool className="size-6 text-text-secondary mx-auto" />
                        <p className="font-body-sm text-sm text-text-secondary">
                          Kliknite na <strong>„Vygenerovať plán“</strong> a AI pripraví konkrétnu
                          stratégiu na záchranu tejto stránky a obnovenie pozícií.
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* 1-Click Handoff CTA */}
                  {plan && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary via-primary-container to-[#174EA6] text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                      <div>
                        <span className="font-label-sm text-xs uppercase font-bold text-primary-fixed block">
                          Automatizovaný refresh
                        </span>
                        <p className="font-body-sm text-sm font-medium text-white">
                          Odošlite zistenia a plán priamo do AI Blog Writeru.
                        </p>
                      </div>
                      <Button
                        variant="studio"
                        size="sm"
                        onClick={sendToWriter}
                        className="rounded-full bg-white text-primary hover:bg-surface-container font-label-md text-xs font-bold px-4 h-9 shrink-0 shadow-xs flex items-center gap-1.5"
                      >
                        <span>Otvoriť v AI Writeri</span>
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-surface-pure rounded-2xl p-8 text-center border border-border-subtle shadow-xs text-text-secondary font-body-sm text-sm">
                  Vyberte stránku zo zoznamu vľavo pre zobrazenie detailu a vygenerovanie plánu.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        title="Odomknite Decay Radar s balíkom Pro"
        description={`V bezplatnej verzii môžete generovať záchranný plán pre prvé 3 podstránky. Pre záchranu všetkých klesajúcich URL a WordPress export aktivujte balík Pro (${PRICE_LINE_LABEL}). Predplatné máš ${TRIAL_LABEL}.`}
      />
    </div>
  );
}
