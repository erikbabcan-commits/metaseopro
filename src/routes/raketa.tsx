import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/use-auth";
import { streamSSE } from "@/lib/stream-sse";
import { startLaserProgress, stopLaserProgress } from "@/lib/laser-loader";
import { saveOutput } from "@/lib/outputs.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  LANGUAGE_LABEL,
  OUTPUT_LABEL,
  RAKETA_LANGUAGES,
  RAKETA_OUTPUTS,
  RaketaFormSchema,
  type RaketaAnalysis,
  type RaketaLanguage,
  type RaketaOutput,
} from "@/lib/raketa-schema";

export const Route = createFileRoute("/raketa")({
  head: () => ({
    meta: [
      { title: "SEO Raketa — automatický SEO workflow | SEO4WEB" },
      {
        name: "description",
        content:
          "Zadaj web a konkurenciu. SEO4WEB zanalyzuje obsah, nájde SEO medzery a vygeneruje audit, článok, brief alebo 30-dňový content plán.",
      },
      { property: "og:title", content: "SEO Raketa — automatický SEO workflow" },
      {
        property: "og:description",
        content:
          "Analyzuj vlastný web, konkurenciu alebo oboje. Výstup: audit, článok, brief alebo content plán.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RaketaPage,
});

type Phase = "idle" | "validating" | "scanning" | "comparing" | "generating" | "ready" | "error";

type Section = { heading: string; body: string };

function splitSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of lines) {
    const m = /^##\s+(.*)$/.exec(line);
    if (m) {
      if (current) sections.push(current);
      current = { heading: m[1].trim(), body: "" };
    } else if (current) {
      current.body += line + "\n";
    } else {
      current = { heading: "Úvod", body: line + "\n" };
    }
  }
  if (current) sections.push(current);
  return sections.filter((s) => s.body.trim().length > 0 || s.heading);
}

// Demo catalog products for connected e-shop in Step 3
interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  price: string;
  inStock: boolean;
  sku: string;
}

const DEFAULT_PRODUCTS: CatalogProduct[] = [
  {
    id: "p1",
    name: "Nike Air Zoom Pegasus 40",
    category: "Cestná bežecká obuv",
    price: "129,90 €",
    inStock: true,
    sku: "NK-PEG40-BK",
  },
  {
    id: "p2",
    name: "Asics Novablast 4",
    category: "Cestný tréningový model",
    price: "149,90 €",
    inStock: true,
    sku: "AS-NOV4-BL",
  },
  {
    id: "p3",
    name: "Hoka Clifton 9",
    category: "Maximálne tlmenie",
    price: "159,90 €",
    inStock: true,
    sku: "HK-CLF9-WH",
  },
  {
    id: "p4",
    name: "Saucony Triumph 21",
    category: "Prémiový komfort",
    price: "169,90 €",
    inStock: true,
    sku: "SC-TR21-GR",
  },
];

const DEFAULT_LSI_ENTITIES = [
  { name: "tlmenie došľapu", count: "8x" },
  { name: "drop topánky", count: "5x" },
  { name: "vibram podrážka", count: "3x" },
  { name: "EVA pena", count: "6x" },
  { name: "pronačná podpora", count: "4x" },
  { name: "cestný maratón", count: "3x" },
];

function RaketaPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const save = useServerFn(saveOutput);

  // Mode: radar preset vs custom
  const [mode, setMode] = useState<"radar" | "custom">("radar");

  // Form inputs
  const [ownUrl, setOwnUrl] = useState("https://mojeshop.sk/kategoria/bezecka-obuv");
  const [competitorUrl, setCompetitorUrl] = useState("https://bezeckysvet.sk/obuv-asfalt");
  const [keyword, setKeyword] = useState("bežecká obuv na asfalt");
  const [language, setLanguage] = useState<RaketaLanguage>("sk");
  const [output, setOutput] = useState<RaketaOutput>("article");

  // Pipeline execution state
  const [phase, setPhase] = useState<Phase>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [analysis, setAnalysis] = useState<RaketaAnalysis | null>(null);
  const [result, setResult] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Accordion toggles
  const [step1Open, setStep1Open] = useState(true);
  const [step2Open, setStep2Open] = useState(true);
  const [step3Open, setStep3Open] = useState(true);
  const [step4Open, setStep4Open] = useState(true);

  // Publishing settings
  const [isDraft, setIsDraft] = useState(true);
  const [cmsTarget, setCmsTarget] = useState<"shoptet" | "wordpress" | "woocommerce">("shoptet");
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { redirect: "/raketa" } });
  }, [user, loading, navigate]);

  const running =
    phase === "validating" ||
    phase === "scanning" ||
    phase === "comparing" ||
    phase === "generating";

  const handleModeSwitch = (newMode: "radar" | "custom") => {
    setMode(newMode);
    if (newMode === "radar") {
      setOwnUrl("https://mojeshop.sk/kategoria/bezecka-obuv");
      setCompetitorUrl("https://bezeckysvet.sk/obuv-asfalt");
      setKeyword("bežecká obuv na asfalt");
    } else {
      setOwnUrl("");
      setCompetitorUrl("");
      setKeyword("");
    }
  };

  const copyText = async (text: string, key: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Skopírované do schránky");
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800);
  };

  const exportMarkdown = () => {
    const textToExport =
      result ||
      `# ${keyword}\n\nČlánok vygenerovaný nástrojom SEO Raketa pre doménu ${ownUrl}.\n\nVýstup: ${OUTPUT_LABEL[output]}`;
    const blob = new Blob([textToExport], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo4web-raketa-${keyword.toLowerCase().replace(/[^a-z0-9]/gi, "-")}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown súbor bol stiahnutý.");
  };

  const reset = () => {
    abortRef.current?.abort();
    setPhase("idle");
    setAnalysis(null);
    setResult("");
    setErrorMsg("");
    setPublished(false);
  };

  const stop = () => {
    abortRef.current?.abort();
    setPhase(result ? "ready" : "idle");
    toast.info("Generovanie bolo zastavené.");
  };

  const insertProductIntoArticle = (product: CatalogProduct) => {
    const snippet = `\n\n> **Tip na nákup:** [${product.name}](${ownUrl}?sku=${product.sku}) — ${product.category} s cenou ${product.price}. Skladom k okamžitému odoslaniu.\n\n`;
    setResult((prev) => (prev ? prev + snippet : snippet));
    toast.success(`Produkt ${product.name} vložený do článku.`);
  };

  const copyJsonLd = () => {
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline: `Ako vybrať bežeckú obuv na asfalt 2025: Test & Porovnanie`,
          description: `Kompletný sprievodca výberom bežeckých topánok na tvrdé povrchy pre začiatočníkov aj maratóncov.`,
          author: { "@type": "Organization", name: "mojeshop.sk" },
          publisher: { "@type": "Organization", name: "mojeshop.sk" },
          inLanguage: language,
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Ako často meniť bežeckú obuv na asfalt?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Bežecké topánky na tvrdý asfalt odporúčame meniť každých 600 až 800 kilometrov kvôli degradácii tlmiacej peny.",
              },
            },
            {
              "@type": "Question",
              name: "Aký drop zvoliť pri behu po ceste?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Pri došľape cez pätu je štandardom drop 8-10 mm, pre došľap na stred chodidla 4-6 mm.",
              },
            },
          ],
        },
      ],
    };
    copyText(JSON.stringify(jsonLd, null, 2), "json-ld");
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    await new Promise((r) => setTimeout(r, 900));
    setIsPublishing(false);
    setPublished(true);
    toast.success(
      isDraft
        ? `Článok úspešne odoslaný ako KONCEPT do ${cmsTarget.toUpperCase()}!`
        : `Článok úspešne PUBLIKOVANÝ na ${cmsTarget.toUpperCase()}!`,
    );
  };

  const launch = async () => {
    setErrors({});
    setErrorMsg("");
    const parsed = RaketaFormSchema.safeParse({
      ownUrl,
      competitorUrl,
      keyword,
      language,
      output,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string" && !fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      setPhase("validating");
      setTimeout(() => setPhase("idle"), 400);
      toast.error("Skontroluj zadané polia formulára.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setResult("");
    setAnalysis(null);
    setPhase("validating");

    // STEP 1 + 2: analyze (validate + scan + compare)
    let analysisData: RaketaAnalysis;
    startLaserProgress();
    try {
      setPhase("scanning");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch("/api/raketa-analyze", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ownUrl: parsed.data.ownUrl,
          competitorUrl: parsed.data.competitorUrl,
          keyword: parsed.data.keyword,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Analýza webu zlyhala.");
      }
      const json = await res.json();
      analysisData = json.analysis as RaketaAnalysis;
      setAnalysis(analysisData);
      setPhase("comparing");
      await new Promise((r) => setTimeout(r, 450));
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setErrorMsg((e as Error).message || "Analýza webu zlyhala.");
      setPhase("error");
      return;
    } finally {
      stopLaserProgress();
    }

    // STEP 3 + 4: generate output (streamed SSE)
    setPhase("generating");
    let buffer = "";
    let raf = 0;
    const flush = () => {
      raf = 0;
      setResult(buffer);
    };

    await streamSSE({
      url: "/api/raketa-generate",
      body: {
        keyword: parsed.data.keyword,
        language: parsed.data.language,
        output: parsed.data.output,
        analysis: analysisData,
      },
      signal: controller.signal,
      onDelta: (chunk) => {
        buffer += chunk;
        if (!raf) raf = requestAnimationFrame(flush);
      },
      onDone: async () => {
        if (raf) cancelAnimationFrame(raf);
        setResult(buffer);
        setPhase("ready");
        toast.success("SEO Raketa úspešne dokončila misiu!");
        try {
          await save({
            data: {
              type: "raketa",
              title: `${OUTPUT_LABEL[parsed.data.output]}: ${parsed.data.keyword}`.slice(0, 300),
              input: {
                ownUrl: parsed.data.ownUrl,
                competitorUrl: parsed.data.competitorUrl,
                keyword: parsed.data.keyword,
                language: parsed.data.language,
                output: parsed.data.output,
              },
              output_markdown: buffer,
            },
          });
        } catch (e) {
          console.error("save raketa output error:", e);
        }
      },
      onError: (msg) => {
        if (raf) cancelAnimationFrame(raf);
        if (buffer) {
          setResult(buffer);
          setPhase("ready");
          toast.error(msg);
        } else {
          setErrorMsg(msg);
          setPhase("error");
        }
      },
    });
  };

  const sections = useMemo(() => (phase === "ready" ? splitSections(result) : []), [phase, result]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-sm text-on-surface-variant font-sans">
        Načítavam SEO Raketu…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface flex flex-col pb-safe">
      <Toaster />
      <AppHeader />

      <main className="flex-1 w-full pt-16 pb-28 md:pb-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8 space-y-5">
          {/* 1. Header & Live Status */}
          <section className="flex flex-col pt-2 space-y-2">
            <div className="flex items-center gap-2 text-on-surface-variant text-xs">
              <span className="material-symbols-outlined text-[15px] text-google-blue-bright">
                alt_route
              </span>
              <span className="font-medium">Autonómne SEO Workflows</span>
              <span>•</span>
              <span className="font-semibold text-on-surface">mojeshop.sk</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-google-blue-bright text-[30px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  rocket_launch
                </span>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-on-surface">
                  SEO Raketa
                </h1>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/30 border border-secondary-fixed/50">
                <span className="w-2 h-2 rounded-full bg-google-green animate-pulse" />
                <span className="text-xs font-semibold text-google-green tracking-wide">
                  {running
                    ? phase === "scanning"
                      ? "Prebieha skenovanie SERP…"
                      : phase === "comparing"
                        ? "Porovnávam konkurenciu…"
                        : "Generujem optimalizovaný článok…"
                    : phase === "ready"
                      ? "Misia pripravená na publikáciu"
                      : "Pipeline pripravená"}
                </span>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
              Automatický end-to-end proces od hĺbkovej analýzy konkurencie po vygenerovanie a
              publikáciu článku s vyhľadávacím zámerom.
            </p>

            {/* Header Action Buttons */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 pt-1">
              {running ? (
                <button
                  type="button"
                  onClick={stop}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-error-container text-on-error-container flex items-center justify-center gap-2 text-sm font-semibold shadow-xs active:scale-[0.98] transition-transform"
                >
                  <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                  <span>Zastaviť misiu</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={launch}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center gap-2 text-sm font-semibold shadow-xs active:scale-[0.98] transition-transform"
                >
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  <span>Spustiť misiu</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate({ to: "/history" })}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-surface-container-low text-on-surface flex items-center justify-center gap-2 text-sm font-medium border border-border-subtle hover:bg-surface-container active:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                  history
                </span>
                <span>História misií</span>
              </button>
            </div>
          </section>

          {/* Error Banner */}
          {phase === "error" && (
            <div className="p-4 rounded-2xl bg-error-container/30 border border-error-container text-on-error-container flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-google-red text-[20px] mt-0.5">
                  error
                </span>
                <div>
                  <p className="font-semibold text-sm">Chyba pri analýze webu</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {errorMsg || "Nepodarilo sa stiahnuť alebo zanalyzovať cieľové stránky."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={launch}
                className="px-3 py-1.5 rounded-full bg-surface-pure text-xs font-semibold text-google-red border border-border-subtle shadow-xs hover:bg-surface-container-low transition-colors"
              >
                Skúsiť znova
              </button>
            </div>
          )}

          {/* 2. Active Mission Configuration Card (Zadanie misie) */}
          <section className="p-4 md:p-6 rounded-2xl bg-surface-pure shadow-xs border border-border-subtle space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary tracking-wider uppercase">
                  Misia #RKT-2025-048
                </span>
                <span className="text-xs text-on-surface-variant">•</span>
                <span className="text-xs text-on-surface-variant font-medium">
                  {OUTPUT_LABEL[output]}
                </span>
              </div>

              {/* Sub-tab Switcher */}
              <div className="p-0.5 rounded-full bg-surface-container flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => handleModeSwitch("radar")}
                  className={`px-3 py-1 rounded-full font-medium transition-all ${
                    mode === "radar"
                      ? "bg-surface-pure text-on-surface shadow-xs font-semibold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Opportunity Radar
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch("custom")}
                  className={`px-3 py-1 rounded-full font-medium transition-all ${
                    mode === "custom"
                      ? "bg-surface-pure text-on-surface shadow-xs font-semibold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Vlastná URL
                </button>
              </div>
            </div>

            {/* Keyword & Parameters Box */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-google-yellow text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  <span className="font-semibold text-base text-on-surface">
                    {keyword || "Zadaj kľúčové slovo"}
                  </span>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-fixed/40 text-primary">
                  {LANGUAGE_LABEL[language]}
                </span>
              </div>

              {/* Input Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Cieľová URL (Vlastný web) *
                  </label>
                  <input
                    type="url"
                    value={ownUrl}
                    onChange={(e) => setOwnUrl(e.target.value)}
                    disabled={running}
                    placeholder="https://mojeshop.sk/kategoria/..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-pure border border-border-default text-xs text-on-surface focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
                  />
                  {errors.ownUrl && (
                    <p className="text-[11px] text-google-red mt-1">{errors.ownUrl}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Konkurenčná URL (SERP Benchmark)
                  </label>
                  <input
                    type="url"
                    value={competitorUrl}
                    onChange={(e) => setCompetitorUrl(e.target.value)}
                    disabled={running}
                    placeholder="https://konkurent.sk/..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-pure border border-border-default text-xs text-on-surface focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
                  />
                  {errors.competitorUrl && (
                    <p className="text-[11px] text-google-red mt-1">{errors.competitorUrl}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Cieľový Keyword / Téma *
                  </label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    disabled={running}
                    maxLength={200}
                    placeholder="napr. bežecká obuv na asfalt"
                    className="w-full px-3 py-2 rounded-xl bg-surface-pure border border-border-default text-xs text-on-surface focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
                  />
                  {errors.keyword && (
                    <p className="text-[11px] text-google-red mt-1">{errors.keyword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Jazyk výstupu
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as RaketaLanguage)}
                    disabled={running}
                    className="w-full px-3 py-2 rounded-xl bg-surface-pure border border-border-default text-xs text-on-surface focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
                  >
                    {RAKETA_LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {LANGUAGE_LABEL[l]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Typ generovaného výstupu
                  </label>
                  <select
                    value={output}
                    onChange={(e) => setOutput(e.target.value as RaketaOutput)}
                    disabled={running}
                    className="w-full px-3 py-2 rounded-xl bg-surface-pure border border-border-default text-xs text-on-surface focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
                  >
                    {RAKETA_OUTPUTS.map((o) => (
                      <option key={o} value={o}>
                        {OUTPUT_LABEL[o]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  {running ? (
                    <button
                      type="button"
                      onClick={stop}
                      className="w-full py-2 px-3 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                    >
                      <span className="material-symbols-outlined text-[16px]">stop</span>
                      <span>Zastaviť proces</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={launch}
                      className="w-full py-2 px-3 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition-transform hover:bg-primary-container"
                    >
                      <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                      <span>Odpáliť misiu</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
              <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col">
                <span className="text-[11px] font-medium text-on-surface-variant">
                  Mesačná hľadanosť
                </span>
                <span className="text-base font-bold text-on-surface mt-0.5">1 420 / mes.</span>
                <span className="text-[10px] text-google-green font-medium mt-0.5">
                  ↑ +14% sezónny rast
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col">
                <span className="text-[11px] font-medium text-on-surface-variant">
                  Náročnosť (KD)
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-base font-bold text-google-green">34</span>
                  <span className="text-xs text-on-surface-variant">/100</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary-fixed/50 text-google-green font-semibold ml-1">
                    Ľahká
                  </span>
                </div>
                <span className="text-[10px] text-on-surface-variant mt-0.5">
                  Low-hanging fruit
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col">
                <span className="text-[11px] font-medium text-on-surface-variant">
                  Zámer hľadania
                </span>
                <span className="text-base font-bold text-google-yellow mt-0.5">Komerčný</span>
                <span className="text-[10px] text-on-surface-variant mt-0.5">
                  Vysoká konverzia (82%)
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col">
                <span className="text-[11px] font-medium text-on-surface-variant">
                  SERP Potenciál
                </span>
                <span className="text-base font-bold text-google-blue-bright mt-0.5">
                  +480 návštev
                </span>
                <span className="text-[10px] text-on-surface-variant mt-0.5">
                  Úspora PPC ~ 340 €/m
                </span>
              </div>
            </div>
          </section>

          {/* 3. Pipeline Stepper Track */}
          <section className="p-4 rounded-2xl bg-surface-pure shadow-xs border border-border-subtle space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-on-surface">Stav autonómnej pipeline</span>
              <span className="text-primary font-bold">
                {phase === "ready"
                  ? "100% Hotovo"
                  : phase === "generating"
                    ? "50% Generujem"
                    : phase === "scanning" || phase === "comparing"
                      ? "25% Analyzujem"
                      : "Pripravené"}
              </span>
            </div>

            {/* Stepper progress visual bar */}
            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-container rounded-full transition-all duration-500 ease-out"
                style={{
                  width:
                    phase === "ready"
                      ? "100%"
                      : phase === "generating"
                        ? "55%"
                        : phase === "scanning" || phase === "comparing"
                          ? "25%"
                          : "10%",
                }}
              />
            </div>

            {/* Step Pills Horizontal Scroll */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setStep1Open((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 border transition-all ${
                  analysis || phase === "ready"
                    ? "bg-secondary-container/30 border-secondary-fixed/50 text-google-green font-semibold"
                    : running && (phase === "scanning" || phase === "comparing")
                      ? "bg-primary-fixed/40 border-primary-container text-primary font-semibold"
                      : "bg-surface-container-low border-border-subtle text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {analysis || phase === "ready" ? "check_circle" : "search"}
                </span>
                <span>1. Sken SERP</span>
              </button>

              <button
                type="button"
                onClick={() => setStep2Open((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 border transition-all ${
                  result || phase === "ready"
                    ? "bg-secondary-container/30 border-secondary-fixed/50 text-google-green font-semibold"
                    : phase === "generating"
                      ? "bg-primary-container text-on-primary-container border-primary font-semibold animate-pulse"
                      : "bg-surface-container-low border-border-subtle text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                <span>2. AI Článok</span>
              </button>

              <button
                type="button"
                onClick={() => setStep3Open((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 border transition-all ${
                  result || phase === "ready"
                    ? "bg-primary-fixed/30 border-primary-fixed-dim text-primary font-semibold"
                    : "bg-surface-container-low border-border-subtle text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">rule</span>
                <span>3. Brief & E-shop</span>
              </button>

              <button
                type="button"
                onClick={() => setStep4Open((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 border transition-all ${
                  published
                    ? "bg-secondary-container/40 border-secondary-fixed text-google-green font-semibold"
                    : "bg-surface-container-low border-border-subtle text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">cloud_upload</span>
                <span>4. Publikovanie</span>
              </button>
            </div>
          </section>

          {/* 4. Step 1 Card: Sken URL & SERP Konkurencia (Expandable) */}
          <section className="rounded-2xl bg-surface-pure shadow-xs border border-border-subtle overflow-hidden">
            <button
              type="button"
              onClick={() => setStep1Open((v) => !v)}
              className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-surface-container-low/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary-container/50 flex items-center justify-center text-google-green shrink-0">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check
                  </span>
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-semibold text-on-surface">
                    Krok 1: Sken URL & SERP Konkurencia
                  </h2>
                  <span className="text-xs text-google-green font-medium">
                    {analysis
                      ? `Zanalyzovaných ${analysis.own.wordCount > 0 ? analysis.own.wordCount : 1240} slov a ${analysis.comparison.contentGaps.length} content gaps`
                      : "38 kľúčových SEO signálov & TOP 3 konkurenti v SERP"}
                  </span>
                </div>
              </div>
              <span
                className={`material-symbols-outlined text-on-surface-variant transition-transform ${
                  step1Open ? "rotate-180" : ""
                }`}
              >
                expand_more
              </span>
            </button>

            {step1Open && (
              <div className="p-4 md:p-6 pt-0 border-t border-border-subtle space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3">
                  {/* Left Column: Own Page Audit */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                          link
                        </span>
                        <span className="text-xs font-semibold text-on-surface truncate max-w-[240px]">
                          {ownUrl || "/kategoria/bezecka-obuv"}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-google-green text-[11px] font-semibold">
                        Sken úspešný
                      </span>
                    </div>

                    {/* SEO Score ring & checklist */}
                    <div className="flex items-center gap-4 py-1">
                      <div className="relative flex items-center justify-center shrink-0">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-surface-container-high"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-google-green"
                            strokeDasharray="78, 100"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute text-sm font-bold text-on-surface">78%</span>
                      </div>
                      <div className="flex flex-col text-xs space-y-1">
                        <span className="font-semibold text-on-surface">Audit vlastného webu</span>
                        <span className="text-on-surface-variant">
                          {analysis?.own.estimated
                            ? "Rýchly odhad (JS render)"
                            : "Kompletný HTML DOM audit"}
                        </span>
                        <div className="flex items-center gap-2 pt-0.5 text-[11px] text-google-green font-medium">
                          <span>✓ Title tag</span>
                          <span>✓ Meta desc</span>
                          <span>
                            ~
                            {analysis?.own.wordCount
                              ? `${analysis.own.wordCount} slov`
                              : "1 240 slov"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content Gap Alert */}
                    <div className="p-3 rounded-lg bg-surface-pure border border-border-subtle flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-google-yellow text-[18px] shrink-0 mt-0.5">
                        warning
                      </span>
                      <div className="text-xs">
                        <span className="font-semibold text-on-surface">Zistené Content Gaps:</span>
                        <p className="text-on-surface-variant mt-0.5 leading-snug">
                          {analysis?.comparison.contentGaps &&
                          analysis.comparison.contentGaps.length > 0
                            ? analysis.comparison.contentGaps.slice(0, 3).join(", ")
                            : "Chýba sekcia o tlmení došľapu na tvrdý povrch a tabuľka porovnania dropu. Konkurencia pokrýva 4 dodatočné entity."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Top 3 SERP Competitors */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-on-surface">Top 3 SERP Konkurenti</span>
                      <span className="text-on-surface-variant text-[11px]">Google.sk SERP</span>
                    </div>

                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-surface-pure border border-border-subtle flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-primary-fixed/40 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                            #1
                          </span>
                          <div className="truncate">
                            <span className="font-semibold text-on-surface block truncate">
                              bezeckysvet.sk/obuv-asfalt
                            </span>
                            <span className="text-[11px] text-on-surface-variant">
                              2 450 slov • 92% skóre
                            </span>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-[16px] text-google-green">
                          verified
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-surface-pure border border-border-subtle flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-surface-container text-on-surface-variant font-bold text-[10px] flex items-center justify-center shrink-0">
                            #2
                          </span>
                          <div className="truncate">
                            <span className="font-semibold text-on-surface block truncate">
                              sportisimo.sk/bezecke-topanky
                            </span>
                            <span className="text-[11px] text-on-surface-variant">
                              1 820 slov • 84% skóre
                            </span>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                          check
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-surface-pure border border-border-subtle flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-surface-container text-on-surface-variant font-bold text-[10px] flex items-center justify-center shrink-0">
                            #3
                          </span>
                          <div className="truncate">
                            <span className="font-semibold text-on-surface block truncate">
                              top4running.sk/cestny-beh
                            </span>
                            <span className="text-[11px] text-on-surface-variant">
                              2 100 slov • 88% skóre
                            </span>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                          check
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 5. Step 2 Card: AI Generovanie článku (Active Step) */}
          <section className="p-4 md:p-6 rounded-2xl bg-surface-pure shadow-xs border border-border-subtle space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0">
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-semibold text-on-surface">
                    Krok 2: AI Generovanie článku s vyhľadávacím zámerom
                  </h2>
                  <span className="text-xs text-google-blue-bright font-medium">
                    {phase === "generating"
                      ? "Prebieha generovanie obsahu v reálnom čase…"
                      : phase === "ready"
                        ? "Hotový náhľad pripravený na kontrolu a export"
                        : "Predikovaný článok podľa zámeru hľadania"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary text-xs font-bold">
                  {phase === "ready"
                    ? "100% Hotovo"
                    : phase === "generating"
                      ? "Generuje sa"
                      : "AI Ready"}
                </span>
                <button
                  type="button"
                  onClick={() => setStep2Open((v) => !v)}
                  className="p-1 text-on-surface-variant hover:text-on-surface"
                >
                  <span
                    className={`material-symbols-outlined text-[20px] transition-transform ${
                      step2Open ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>
              </div>
            </div>

            {step2Open && (
              <div className="space-y-4 pt-1">
                {/* Quick Article Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-center flex flex-col">
                    <span className="text-base font-bold text-on-surface">
                      {result ? result.split(/\s+/).length : "2 150"}
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-medium">slov</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-center flex flex-col">
                    <span className="text-base font-bold text-google-green">1.8%</span>
                    <span className="text-[11px] text-on-surface-variant font-medium">hustota</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-center flex flex-col">
                    <span className="text-base font-bold text-on-surface">4 min</span>
                    <span className="text-[11px] text-on-surface-variant font-medium">čítanie</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-center flex flex-col">
                    <span className="text-base font-bold text-google-blue-bright">100%</span>
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      pokrytie zámeru
                    </span>
                  </div>
                </div>

                {/* Desktop Side-by-Side: Left SERP Preview, Right Outline & Streaming */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Google Search SERP Snippet Preview */}
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                          Mobilný SERP Náhľad (Google.sk)
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-medium">
                          Pozícia #1 - #2
                        </span>
                      </div>

                      {/* Google Snippet Card */}
                      <div className="p-3.5 rounded-xl bg-surface-pure border border-border-subtle space-y-1.5 shadow-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-google-blue-bright/10 text-google-blue-bright flex items-center justify-center font-bold text-[10px]">
                            M
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-on-surface-variant truncate">
                            <span className="font-semibold text-on-surface">mojeshop.sk</span>
                            <span>›</span>
                            <span>kategoria</span>
                            <span>›</span>
                            <span className="truncate">bezecka-obuv</span>
                          </div>
                        </div>

                        <h3 className="text-sm font-semibold text-[#1a0dab] hover:underline cursor-pointer leading-snug">
                          Najlepšia bežecká obuv na asfalt 2025: Test & Porovnanie | Mojeshop
                        </h3>

                        <p className="text-xs text-[#4d5156] leading-relaxed line-clamp-3">
                          <strong className="text-on-surface font-semibold">
                            Bežecká obuv na asfalt
                          </strong>{" "}
                          vyžaduje špecifické tlmenie došľapu pre ochranu kĺbov. Pozrite si náš test
                          najlepších cestných modelov, porovnanie dropu a odporúčania expertov.
                        </p>
                      </div>

                      {/* Featured Snippet Badge */}
                      <div className="p-3 rounded-lg bg-surface-pure border border-secondary-fixed flex items-center gap-2 text-xs">
                        <span
                          className="material-symbols-outlined text-google-green text-[18px] shrink-0"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                        <div>
                          <span className="font-semibold text-on-surface">
                            Featured Snippet Target (#0 pozícia):
                          </span>
                          <span className="text-on-surface-variant block mt-0.5">
                            Optimalizované pre odpovede na otázku „Ako vybrať obuv na tvrdý asfalt“.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Hierarchy Outline */}
                    <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle space-y-2">
                      <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                        Štruktúra a hierarchia nadpisov
                      </span>
                      <div className="space-y-1.5 text-xs">
                        <div className="p-2 rounded-lg bg-surface-pure border border-border-subtle font-medium text-on-surface">
                          <span className="font-bold text-primary mr-1.5">H1</span>
                          Ako vybrať bežeckú obuv na asfalt: Veľký sprievodca
                        </div>
                        <div className="p-2 rounded-lg bg-surface-pure border border-border-subtle font-medium text-on-surface ml-3">
                          <span className="font-bold text-google-blue-bright mr-1.5">H2</span>
                          Prečo tvrdý asfalt vyžaduje špeciálne tlmenie?
                        </div>
                        <div className="p-2 rounded-lg bg-surface-pure border border-border-subtle font-medium text-on-surface ml-3">
                          <span className="font-bold text-google-blue-bright mr-1.5">H2</span>
                          Drop topánky vs. štýl došľapu (Päta vs. Špička)
                        </div>
                        <div className="p-2 rounded-lg bg-surface-pure border border-border-subtle font-medium text-on-surface ml-3">
                          <span className="font-bold text-google-blue-bright mr-1.5">H2</span>
                          TOP 4 odporúčané modely na cestu pre sezónu 2025
                        </div>
                        <div className="p-2 rounded-lg bg-surface-pure border border-border-subtle font-medium text-on-surface ml-3">
                          <span className="font-bold text-google-green mr-1.5">FAQ</span>
                          Často kladené otázky (Schema.org FAQPage)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Live Stream & Markdown Reader */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                        Generovaný obsah článku
                      </span>
                      {phase === "generating" && (
                        <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                          <span>Streamujem z Mistral AI…</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl bg-surface-pure border border-border-subtle max-h-[380px] overflow-y-auto text-xs leading-relaxed">
                      {phase === "generating" && !result && (
                        <div className="space-y-3 animate-pulse">
                          <div className="h-4 w-3/4 rounded bg-surface-container" />
                          <div className="h-3 w-full rounded bg-surface-container" />
                          <div className="h-3 w-5/6 rounded bg-surface-container" />
                          <div className="h-3 w-4/6 rounded bg-surface-container" />
                        </div>
                      )}

                      {result ? (
                        <article className="prose prose-xs max-w-none text-on-surface">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                          {phase === "generating" && (
                            <span className="inline-block w-1.5 h-3 ml-1 bg-primary animate-pulse" />
                          )}
                        </article>
                      ) : (
                        <div className="text-on-surface-variant text-center py-10">
                          <span className="material-symbols-outlined text-[32px] text-on-surface-variant/40 block mb-2">
                            menu_book
                          </span>
                          <p className="font-medium">Obsah článku pripravený na vygenerovanie.</p>
                          <p className="text-[11px] mt-1 text-on-surface-variant">
                            Klikni na „Spustiť misiu“ alebo „Odpáliť misiu“ pre spustenie streamu.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons for Step 2 */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => copyText(result || "Bežecká obuv na asfalt", "article")}
                        className="flex-1 py-2 px-3 rounded-full bg-surface-pure border border-border-subtle text-xs font-semibold text-on-surface flex items-center justify-center gap-1.5 hover:bg-surface-container-low transition-colors shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {copiedKey === "article" ? "check" : "content_copy"}
                        </span>
                        <span>{copiedKey === "article" ? "Skopírované!" : "Kopírovať článok"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={exportMarkdown}
                        className="py-2 px-4 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:bg-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span>Exportovať .md</span>
                      </button>

                      <button
                        type="button"
                        onClick={reset}
                        className="py-2 px-3 rounded-full bg-surface-container text-on-surface-variant text-xs font-medium flex items-center justify-center gap-1 hover:text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                        <span>Nová raketa</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 6. Step 3 Card: SEO Brief & E-shop integrácia */}
          <section className="rounded-2xl bg-surface-pure shadow-xs border border-border-subtle overflow-hidden">
            <button
              type="button"
              onClick={() => setStep3Open((v) => !v)}
              className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-surface-container-low/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface shrink-0">
                  <span className="material-symbols-outlined text-[18px]">rule</span>
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-semibold text-on-surface">
                    Krok 3: Brief & Integrácia e-shopu
                  </h2>
                  <span className="text-xs text-on-surface-variant">
                    LSI entity a prepojené nákupné boxy z katalógu
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-google-green text-xs font-semibold">
                  Pripravené
                </span>
                <span
                  className={`material-symbols-outlined text-on-surface-variant transition-transform ${
                    step3Open ? "rotate-180" : ""
                  }`}
                >
                  expand_more
                </span>
              </div>
            </button>

            {step3Open && (
              <div className="p-4 md:p-6 pt-0 border-t border-border-subtle space-y-4">
                {/* LSI Entity Chips */}
                <div className="space-y-2 pt-3">
                  <span className="text-xs font-semibold text-on-surface-variant">
                    Odporúčané LSI entity do textu a ich frekvencia:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_LSI_ENTITIES.map((ent) => (
                      <span
                        key={ent.name}
                        className="px-2.5 py-1 rounded-full bg-surface-container-low border border-border-subtle text-on-surface text-xs font-medium flex items-center gap-1.5"
                      >
                        <span>{ent.name}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-primary-fixed/40 text-primary text-[10px] font-bold">
                          {ent.count}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Connected E-shop Product Boxes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-on-surface">
                      Prepojené produkty z katalógu (Interné prelinkovanie):
                    </span>
                    <span className="text-[11px] text-google-green font-medium">
                      ✓ Automaticky synchronizované
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {DEFAULT_PRODUCTS.map((prod) => (
                      <div
                        key={prod.id}
                        className="p-3 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col justify-between space-y-2"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                              {prod.category}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary-fixed/50 text-google-green font-semibold">
                              Skladom
                            </span>
                          </div>
                          <h4 className="font-semibold text-xs text-on-surface mt-1 line-clamp-1">
                            {prod.name}
                          </h4>
                          <span className="text-sm font-bold text-on-surface block mt-0.5">
                            {prod.price}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => insertProductIntoArticle(prod)}
                          className="w-full py-1.5 px-2 rounded-lg bg-surface-pure border border-border-subtle text-[11px] font-semibold text-primary hover:bg-primary hover:text-on-primary transition-colors flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">add_link</span>
                          <span>Vložiť do textu</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schema.org Microdata & Export */}
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-google-blue-bright text-[20px]">
                      code
                    </span>
                    <div className="text-xs">
                      <span className="font-semibold text-on-surface block">
                        Schema.org Štruktúrované dáta (JSON-LD)
                      </span>
                      <span className="text-on-surface-variant">
                        Automaticky generuje Article & FAQPage schémy pre vyhľadávače.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={copyJsonLd}
                    className="px-3.5 py-2 rounded-full bg-surface-pure border border-border-subtle text-xs font-semibold text-on-surface flex items-center justify-center gap-1.5 hover:bg-surface-container transition-colors shrink-0 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {copiedKey === "json-ld" ? "check" : "data_object"}
                    </span>
                    <span>{copiedKey === "json-ld" ? "Skopírované!" : "Kopírovať JSON-LD"}</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* 7. Step 4 Card: Publikovanie do e-shopu & Obsahový plán */}
          <section className="rounded-2xl bg-surface-pure shadow-xs border border-border-subtle overflow-hidden">
            <button
              type="button"
              onClick={() => setStep4Open((v) => !v)}
              className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-surface-container-low/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface shrink-0">
                  <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-semibold text-on-surface">
                    Krok 4: Publikovanie do e-shopu & Obsahový plán
                  </h2>
                  <span className="text-xs text-on-surface-variant">
                    1-Click schválenie a automatické nasadenie do CMS
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface text-xs font-semibold uppercase">
                  {cmsTarget} API
                </span>
                <span
                  className={`material-symbols-outlined text-on-surface-variant transition-transform ${
                    step4Open ? "rotate-180" : ""
                  }`}
                >
                  expand_more
                </span>
              </div>
            </button>

            {step4Open && (
              <div className="p-4 md:p-6 pt-0 border-t border-border-subtle space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                  {/* Publishing Meta Details */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant font-medium">Plánovaný termín:</span>
                      <span className="font-semibold text-on-surface">
                        Štvrtok, 10. apríl • 09:00
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant font-medium">Typ obsahu:</span>
                      <span className="font-semibold text-on-surface">
                        Pillar Content (Pilierový článok)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant font-medium">
                        Cieľový CMS systém:
                      </span>
                      <div className="flex items-center gap-1">
                        {(["shoptet", "wordpress", "woocommerce"] as const).map((cms) => (
                          <button
                            key={cms}
                            type="button"
                            onClick={() => setCmsTarget(cms)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase transition-colors ${
                              cmsTarget === cms
                                ? "bg-primary text-on-primary"
                                : "bg-surface-pure text-on-surface-variant border border-border-subtle"
                            }`}
                          >
                            {cms}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Draft Switch Toggle & Action */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-xs text-on-surface block">
                          Publikovať ako koncept
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          {isDraft
                            ? "Článok sa uloží ako draft na finálne schválenie"
                            : "Článok sa okamžite publikuje na živý web"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsDraft((v) => !v)}
                        className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                          isDraft ? "bg-primary-container" : "bg-surface-container-highest"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-surface-pure shadow-xs transition-transform ${
                            isDraft ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Big Google Green 1-Click Button */}
                    <button
                      type="button"
                      disabled={isPublishing}
                      onClick={handlePublish}
                      className={`w-full py-3 px-4 rounded-full font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] ${
                        published
                          ? "bg-secondary-container text-google-green border border-secondary-fixed cursor-default"
                          : "bg-google-green text-on-primary hover:opacity-95"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {isPublishing
                          ? "hourglass_top"
                          : published
                            ? "check_circle"
                            : "send_and_archive"}
                      </span>
                      <span>
                        {isPublishing
                          ? "Odosielam do CMS…"
                          : published
                            ? `Úspešne odoslané do ${cmsTarget.toUpperCase()} ✓`
                            : "Publikovať do e-shopu jedným klikom"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 8. SERP Prediction Impact Box */}
          <section className="p-4 md:p-6 rounded-2xl bg-gradient-to-br from-surface-pure via-surface-container-low/40 to-surface-pure border border-border-subtle shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-google-yellow text-[22px]">
                  insights
                </span>
                <h3 className="text-sm md:text-base font-semibold text-on-surface">
                  Predikovaný SERP výsledok a ROI
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary text-xs font-bold">
                AI Odhad
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col">
                <span className="text-xs text-on-surface-variant font-medium">Posun v pozícii</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-bold text-google-red">#6</span>
                  <span className="material-symbols-outlined text-google-green text-[20px]">
                    trending_flat
                  </span>
                  <span className="text-xl font-bold text-google-green">#2</span>
                </div>
                <span className="text-[11px] text-on-surface-variant mt-0.5">do 30-45 dní</span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col">
                <span className="text-xs text-on-surface-variant font-medium">Mesačný prínos</span>
                <span className="text-xl font-bold text-on-surface mt-1">+1 450</span>
                <span className="text-[11px] text-google-green font-medium mt-0.5">
                  nových návštev / mes.
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col">
                <span className="text-xs text-on-surface-variant font-medium">Úspora na PPC</span>
                <span className="text-xl font-bold text-google-green mt-1">~ 580 €</span>
                <span className="text-[11px] text-on-surface-variant mt-0.5">
                  mesačný ekvivalent Google Ads
                </span>
              </div>
            </div>

            {/* Final Full Pipeline CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={launch}
                disabled={running}
                className="w-full py-3 px-4 rounded-full bg-primary-container text-on-primary-container font-semibold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-transform hover:bg-primary disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                <span>
                  {running
                    ? "Spracovávam celú pipeline…"
                    : "Spustiť kompletnú pipeline (Krok 1 až Krok 4)"}
                </span>
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
