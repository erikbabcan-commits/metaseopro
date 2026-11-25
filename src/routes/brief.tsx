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
import { saveOutput } from "@/lib/outputs.functions";
import { CmsDeployDialog } from "@/components/CmsDeployDialog";

export const Route = createFileRoute("/brief")({
  head: () => ({
    meta: [
      { title: "AI SEO Content Brief — SEO4WEB" },
      {
        name: "description",
        content:
          "Vygeneruj profesionálny SEO content brief: keywordy, štruktúru, meta tagy, FAQ, LSI entity a Shoptet produkty pre slovenský trh.",
      },
      { property: "og:title", content: "AI SEO Content Brief — SEO4WEB" },
      {
        property: "og:description",
        content:
          "Kompletný SEO brief pre copywritera, štruktúra nadpisov H1-H3, PAA otázky a prepojené e-shop produkty.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BriefPage,
});

type Goal = "" | "traffic" | "leads" | "authority" | "local" | "sales";

interface PaaQuestion {
  id: string;
  question: string;
  answerSnippet: string;
  source: string;
}

const DEFAULT_PAA: PaaQuestion[] = [
  {
    id: "paa-1",
    question: "Ako často meniť bežeckú obuv na asfalt?",
    answerSnippet:
      "Bežecké topánky na tvrdý asfalt odporúčame meniť každých 600 až 800 kilometrov. Po tomto nájazde dochádza k únave tlmiacej EVA peny a strate stability.",
    source: "Google SK SERP PAA #1",
  },
  {
    id: "paa-2",
    question: "Aký je ideálny drop pre cestný beh?",
    answerSnippet:
      "Pri došľape cez pätu je štandardom drop 8–10 mm, pre došľap na stred chodidla a rýchlejšie tempo je optimálny drop 4–6 mm.",
    source: "Google SK SERP PAA #2",
  },
  {
    id: "paa-3",
    question: "Môžem behať na asfalte v trailových topánkach?",
    answerSnippet:
      "Nie je to odporúčané. Agresívny dezén trailovej podrážky sa na tvrdom asfalte rýchlo opotrebúva a neposkytuje dostatočné plošné tlmenie.",
    source: "Google SK SERP PAA #3",
  },
];

const DEFAULT_LSI = [
  { name: "tlmenie došľapu", count: "8x" },
  { name: "drop topánky", count: "5x" },
  { name: "vibram podrážka", count: "3x" },
  { name: "EVA pena", count: "6x" },
  { name: "pronačná podpora", count: "4x" },
  { name: "cestný maratón", count: "3x" },
  { name: "rekuperácia energie", count: "4x" },
  { name: "priedušný zvršok", count: "5x" },
];

const DEFAULT_PRODUCTS = [
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
    category: "Maximálne tlmenie došľapu",
    price: "159,90 €",
    inStock: true,
    sku: "HK-CLF9-WH",
  },
  {
    id: "p4",
    name: "Saucony Triumph 21",
    category: "Prémiový maratónsky komfort",
    price: "169,90 €",
    inStock: true,
    sku: "SC-TR21-GR",
  },
];

function BriefPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const save = useServerFn(saveOutput);

  // Tab navigation: 'all' (Kompletný Brief) | 'outline' (Osnova & PAA) | 'entities' (LSI & E-shop) | 'generator' (AI Generátor)
  const [activeTab, setActiveTab] = useState<"all" | "outline" | "entities" | "generator">("all");

  // Input fields for Generator & Brief
  const [domain, setDomain] = useState("mojeshop.sk");
  const [topic, setTopic] = useState("bežecká obuv na asfalt");
  const [targetUrl, setTargetUrl] = useState("/poradna/bezecka-obuv-na-asfalt");
  const [audience, setAudience] = useState(
    "Začiatočníci a pokročilí bežci hľadajúci obuv na tvrdé povrchy",
  );
  const [goal, setGoal] = useState<Goal>("sales");
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([
    "https://bezeckysvet.sk/obuv-asfalt",
    "https://sportisimo.sk/bezecke-topanky",
  ]);

  // Live SSE streaming generation state
  const [generatedBrief, setGeneratedBrief] = useState("");
  const [status, setStatus] = useState<"idle" | "streaming" | "done">("idle");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deployOpen, setDeployOpen] = useState(false);
  const [paaOpen, setPaaOpen] = useState<Record<string, boolean>>({ "paa-1": true });

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { redirect: "/brief" } });
  }, [user, loading, navigate]);

  const togglePaa = (id: string) => {
    setPaaOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyText = async (text: string, key: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Skopírované do schránky");
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1600);
  };

  const exportMarkdown = () => {
    const textToExport =
      generatedBrief ||
      `# SEO Content Brief: ${topic}\n\nDoména: ${domain}\nCieľová URL: ${targetUrl}\nCieľ: ${goal}\nCieľové publikum: ${audience}\n\n## H1: Ako vybrať bežeckú obuv na asfalt: Veľký sprievodca\n\n### H2: Prečo tvrdý asfalt vyžaduje špeciálne tlmenie?\n\n### H2: Drop topánky vs. štýl došľapu\n\n### H2: TOP 4 odporúčané modely na cestu pre sezónu 2025\n\n### FAQ (Schema.org FAQPage)\n${DEFAULT_PAA.map((p) => `- **${p.question}**\n  ${p.answerSnippet}`).join("\n\n")}`;

    const blob = new Blob([textToExport], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo4web-brief-${topic.toLowerCase().replace(/[^a-z0-9]/gi, "-")}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown súbor briefu bol stiahnutý.");
  };

  const handleLaunchRaketa = () => {
    toast.info("Prenášam parametre do SEO Rakety…");
    navigate({ to: "/raketa" });
  };

  const handleScheduleInCalendar = () => {
    toast.success("Brief zaradený do publikačného plánu na Piatok 17. Okt!");
    navigate({ to: "/plan" });
  };

  const insertProductIntoBrief = (prodName: string) => {
    toast.success(`Produkt ${prodName} pridaný do prelinkovania briefu.`);
  };

  const addCompetitor = () => {
    const val = competitorInput.trim();
    if (!val) return;
    if (competitors.includes(val)) {
      toast.error("Tento konkurent už je v zozname.");
      return;
    }
    setCompetitors((prev) => [...prev, val]);
    setCompetitorInput("");
  };

  const removeCompetitor = (item: string) => {
    setCompetitors((prev) => prev.filter((c) => c !== item));
  };

  const runStreamingGenerator = async () => {
    if (topic.trim().length < 2) {
      toast.error("Zadaj tému alebo hlavné kľúčové slovo.");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("streaming");
    setGeneratedBrief("");

    let buffer = "";
    let raf = 0;
    const flush = () => {
      raf = 0;
      setGeneratedBrief(buffer);
    };

    await streamSSE({
      url: "/api/generate-brief",
      body: {
        domain: domain.trim(),
        topic: topic.trim(),
        audience: audience.trim(),
        language: "Slovenčina (SK)",
        competitors,
        goal,
      },
      signal: controller.signal,
      onDelta: (chunk) => {
        buffer += chunk;
        if (!raf) raf = requestAnimationFrame(flush);
      },
      onDone: async () => {
        if (raf) cancelAnimationFrame(raf);
        setGeneratedBrief(buffer);
        setStatus("done");
        toast.success("AI SEO Brief bol úspešne vygenerovaný!");
        try {
          await save({
            data: {
              type: "brief",
              title: `Brief: ${topic.trim()}`.slice(0, 200),
              input: { domain, topic, audience, goal, competitors },
              output_markdown: buffer,
            },
          });
        } catch (e) {
          console.error("Save brief error:", e);
        }
      },
      onError: (err) => {
        if (raf) cancelAnimationFrame(raf);
        if (buffer) {
          setGeneratedBrief(buffer);
          setStatus("done");
        } else {
          setStatus("idle");
        }
        toast.error(err || "Chyba pri generovaní briefu.");
      },
    });
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
    setStatus(generatedBrief ? "done" : "idle");
    toast.info("Generovanie bolo zastavené.");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-sm text-on-surface-variant font-sans">
        Načítavam AI SEO Brief…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface flex flex-col pb-safe">
      <Toaster />
      <AppHeader />

      <main className="flex-1 w-full pt-16 pb-28 md:pb-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8 space-y-4">
          {/* 1. HLAVIČKA BRIEFU & SYNC */}
          <section className="flex flex-col pt-2 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[15px] text-google-blue-bright">
                  assignment
                </span>
                <span className="font-medium">SEO Content Briefing</span>
                <span>•</span>
                <span className="font-semibold text-on-surface">{domain}</span>
                <span>•</span>
                <span>Shoptet v2.4</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/40 text-google-green font-semibold">
                <span className="w-2 h-2 rounded-full bg-google-green animate-pulse" />
                <span>Brief pripravený pre copywritera</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-on-surface">
                  AI SEO Content Brief
                </h1>
                <p className="text-xs md:text-sm text-on-surface-variant mt-0.5">
                  Komplexné zadanie pre tvorbu článku: SERP analýza, osnova H1–H3, Google PAA & LSI
                  entity
                </p>
              </div>

              {/* Rýchle akcie */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportMarkdown}
                  className="px-3.5 py-1.5 rounded-full bg-surface-pure border border-border-subtle text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  <span>Export .md</span>
                </button>
                <button
                  type="button"
                  onClick={handleLaunchRaketa}
                  className="px-4 py-2 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-primary transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                  <span>Odpáliť v SEO Rakete</span>
                </button>
              </div>
            </div>
          </section>

          {/* 2. VSTUPNÉ KĽÚČOVÉ SLOVO & SEO METRIKY */}
          <section className="p-4 md:p-6 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-google-yellow text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                <div>
                  <h2 className="text-base md:text-lg font-bold text-on-surface">
                    {topic || "Zadaj kľúčové slovo"}
                  </h2>
                  <span className="text-xs text-on-surface-variant font-mono">{targetUrl}</span>
                </div>
              </div>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary-fixed/40 text-primary">
                Slovenčina (SK) • Google.sk
              </span>
            </div>

            {/* Grid 4 metrík */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col">
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase">
                  Mesačná Hľadanosť
                </span>
                <span className="text-lg font-bold text-on-surface mt-0.5">1 420 / mes.</span>
                <span className="text-[10px] text-google-green font-medium mt-0.5">
                  ↑ +14% sezónny trend
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col">
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase">
                  Náročnosť (KD)
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-lg font-bold text-google-green">34</span>
                  <span className="text-xs text-on-surface-variant">/100</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary-fixed/50 text-google-green font-bold ml-1">
                    Ľahká
                  </span>
                </div>
                <span className="text-[10px] text-on-surface-variant mt-0.5">
                  Vysoká šanca na TOP 3
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col">
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase">
                  Zámer Hľadania
                </span>
                <span className="text-lg font-bold text-google-yellow mt-0.5">Komerčný</span>
                <span className="text-[10px] text-on-surface-variant mt-0.5">
                  82% nákupný zámer
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col">
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase">
                  Odporúčaná Dĺžka
                </span>
                <span className="text-lg font-bold text-google-blue-bright mt-0.5">
                  1 800 – 2 200
                </span>
                <span className="text-[10px] text-on-surface-variant mt-0.5">
                  slov (SERP benchmark)
                </span>
              </div>
            </div>
          </section>

          {/* 3. SEGMENTED TAB BAR */}
          <section className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs overflow-x-auto text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-xl font-medium shrink-0 transition-all ${
                activeTab === "all"
                  ? "bg-primary-container text-on-primary-container font-semibold shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Kompletný Brief
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("outline")}
              className={`px-4 py-2 rounded-xl font-medium shrink-0 transition-all ${
                activeTab === "outline"
                  ? "bg-primary-container text-on-primary-container font-semibold shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Osnova & PAA
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("entities")}
              className={`px-4 py-2 rounded-xl font-medium shrink-0 transition-all ${
                activeTab === "entities"
                  ? "bg-primary-container text-on-primary-container font-semibold shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Entity & E-shop
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("generator")}
              className={`px-4 py-2 rounded-xl font-medium shrink-0 transition-all ${
                activeTab === "generator"
                  ? "bg-primary text-on-primary font-semibold shadow-xs"
                  : "text-primary font-semibold hover:bg-surface-container-low"
              }`}
            >
              ✨ AI Generátor
            </button>
          </section>

          {/* 4. AI GENERÁTOR TAB (Keď je aktívny tab generator) */}
          {activeTab === "generator" && (
            <section className="p-4 md:p-6 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    auto_awesome
                  </span>
                  <h3 className="text-base font-semibold text-on-surface">
                    Generovať vlastný SEO Content Brief v reálnom čase
                  </h3>
                </div>
                <span className="text-xs text-on-surface-variant">Mistral AI Streaming</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-on-surface-variant mb-1">
                    Cieľová doména
                  </label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    disabled={status === "streaming"}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-border-default focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-on-surface-variant mb-1">
                    Téma / Hlavné kľúčové slovo *
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={status === "streaming"}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-border-default focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-on-surface-variant mb-1">
                    Cieľové publikum
                  </label>
                  <input
                    type="text"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    disabled={status === "streaming"}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-border-default focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-on-surface-variant mb-1">
                    Konkurenčné URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={competitorInput}
                      onChange={(e) => setCompetitorInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCompetitor())}
                      placeholder="https://..."
                      disabled={status === "streaming"}
                      className="flex-1 px-3 py-2 rounded-xl bg-surface-container-low border border-border-default focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addCompetitor}
                      disabled={status === "streaming"}
                      className="px-3 py-2 rounded-xl bg-surface-container text-xs font-semibold"
                    >
                      Pridať
                    </button>
                  </div>
                </div>
              </div>

              {/* Competitors list */}
              {competitors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {competitors.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low border border-border-subtle text-xs"
                    >
                      <span className="truncate max-w-[200px]">{c}</span>
                      <button
                        type="button"
                        onClick={() => removeCompetitor(c)}
                        className="text-on-surface-variant hover:text-google-red"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className="text-xs text-on-surface-variant hover:text-on-surface"
                >
                  Naspäť na prehľad
                </button>

                {status === "streaming" ? (
                  <button
                    type="button"
                    onClick={stopGeneration}
                    className="px-5 py-2.5 rounded-full bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">stop</span>
                    <span>Zastaviť generovanie</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={runStreamingGenerator}
                    className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-primary-container transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    <span>Vygenerovať AI Brief</span>
                  </button>
                )}
              </div>

              {/* Streaming Output Container */}
              {generatedBrief && (
                <div className="mt-4 p-4 rounded-xl bg-surface-container-low border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                    <span className="text-xs font-semibold text-on-surface">
                      Výsledok AI generovania:
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(generatedBrief, "gen-brief")}
                      className="px-3 py-1 rounded-full bg-surface-pure border border-border-subtle text-xs font-medium text-on-surface shadow-xs"
                    >
                      {copiedKey === "gen-brief" ? "Skopírované!" : "Kopírovať"}
                    </button>
                  </div>
                  <div className="max-h-[380px] overflow-y-auto text-xs leading-relaxed prose prose-xs max-w-none text-on-surface">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedBrief}</ReactMarkdown>
                    {status === "streaming" && (
                      <span className="inline-block w-1.5 h-3 ml-1 bg-primary animate-pulse" />
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 5. KARTA STAVU BRIEFU & ŠPECIFIKÁCIE (Viditeľná pri 'all') */}
          {(activeTab === "all" || activeTab === "outline") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Spec Card & Google SERP Preview */}
              <div className="space-y-4">
                {/* Karta stavu briefu & Špecifikácia */}
                <div className="p-4 md:p-5 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      Špecifikácia pre copywritera
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-google-green text-[11px] font-bold">
                      E-E-A-T Overené
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-border-subtle pb-1.5">
                      <span className="text-on-surface-variant font-medium">Cieľová persóna:</span>
                      <span className="font-semibold text-on-surface text-right max-w-[240px]">
                        {audience}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border-subtle pb-1.5">
                      <span className="text-on-surface-variant font-medium">Tón komunikácie:</span>
                      <span className="font-semibold text-on-surface">
                        Odborný, povzbudzujúci, praktický
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border-subtle pb-1.5">
                      <span className="text-on-surface-variant font-medium">
                        Primárna konverzia:
                      </span>
                      <span className="font-semibold text-google-green">
                        Preklik na kategóriu bežeckej obuvi
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant font-medium">Kanonická adresa:</span>
                      <span className="font-mono text-on-surface truncate max-w-[200px]">
                        {targetUrl}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Google Mobile SERP Náhľad */}
                <div className="p-4 md:p-5 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                      Google.sk Mobilný SERP Náhľad
                    </span>
                    <span className="text-[11px] text-google-green font-semibold">Pozícia #1</span>
                  </div>

                  {/* SERP Snippet Box */}
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-google-blue-bright/10 text-google-blue-bright flex items-center justify-center font-bold text-[10px]">
                        M
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-on-surface-variant truncate">
                        <span className="font-semibold text-on-surface">mojeshop.sk</span>
                        <span>›</span>
                        <span>poradna</span>
                        <span>›</span>
                        <span className="truncate">bezecka-obuv-na-asfalt</span>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-[#1a0dab] hover:underline cursor-pointer leading-snug">
                      Ako vybrať bežeckú obuv na asfalt 2025: Test & Porovnanie
                    </h3>

                    <p className="text-xs text-[#4d5156] leading-relaxed">
                      <strong className="text-on-surface font-semibold">
                        Bežecká obuv na asfalt
                      </strong>{" "}
                      vyžaduje špecifické tlmenie došľapu pre ochranu kĺbov. Pozrite si náš test
                      najlepších cestných modelov, porovnanie dropu a odporúčania expertov.
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-on-surface-variant border-t border-border-subtle/80">
                      <span>Titulok: 58 / 60 znakov ✓</span>
                      <span>Meta popis: 152 / 160 znakov ✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Outline Tree & PAA Questions */}
              <div className="space-y-4">
                {/* 6. NAVRHOVANÁ ŠTRUKTÚRA NADPISOV (H1 - H3) */}
                <div className="p-4 md:p-5 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-google-blue-bright">
                        format_list_bulleted
                      </span>
                      <h3 className="text-sm md:text-base font-bold text-on-surface">
                        Navrhovaná štruktúra nadpisov (Osnova)
                      </h3>
                    </div>
                    <span className="text-xs text-google-green font-semibold">6 sekcií</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle flex items-start gap-2">
                      <span className="font-bold text-primary px-1.5 py-0.5 rounded bg-primary-fixed/50 shrink-0">
                        H1
                      </span>
                      <span className="font-semibold text-on-surface">
                        Ako vybrať bežeckú obuv na asfalt: Veľký sprievodca pre začiatočníkov aj
                        maratóncov
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle flex items-start gap-2 ml-3">
                      <span className="font-bold text-google-blue-bright px-1.5 py-0.5 rounded bg-primary-fixed/30 shrink-0">
                        H2
                      </span>
                      <div>
                        <span className="font-semibold text-on-surface block">
                          Prečo tvrdý asfalt vyžaduje špeciálne tlmenie?
                        </span>
                        <span className="text-[11px] text-on-surface-variant block mt-0.5">
                          Vysvetlenie sily nárazu a anatómie kolena pri behu na tvrdom povrchu.
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle flex items-start gap-2 ml-6">
                      <span className="font-bold text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container shrink-0">
                        H3
                      </span>
                      <span className="text-on-surface">
                        Tlmiaca pena EVA vs. moderné dusíkové zmesi (Pebax, ZoomX)
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle flex items-start gap-2 ml-3">
                      <span className="font-bold text-google-blue-bright px-1.5 py-0.5 rounded bg-primary-fixed/30 shrink-0">
                        H2
                      </span>
                      <span className="font-semibold text-on-surface">
                        Drop topánky vs. štýl došľapu: Päta alebo špička?
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle flex items-start gap-2 ml-3">
                      <span className="font-bold text-google-blue-bright px-1.5 py-0.5 rounded bg-primary-fixed/30 shrink-0">
                        H2
                      </span>
                      <span className="font-semibold text-on-surface">
                        TOP 4 odporúčané modely na cestu pre sezónu 2025
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle flex items-start gap-2 ml-3">
                      <span className="font-bold text-google-green px-1.5 py-0.5 rounded bg-secondary-fixed/50 shrink-0">
                        FAQ
                      </span>
                      <span className="font-semibold text-on-surface">
                        Často kladené otázky (Schema.org FAQPage)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 7. GOOGLE PAA (ĽUDIA SA TIEŽ PÝTAJÚ) */}
                <div className="p-4 md:p-5 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-google-yellow text-[20px]">
                        help_outline
                      </span>
                      <h3 className="text-sm md:text-base font-bold text-on-surface">
                        Google PAA (Ľudia sa tiež pýtajú)
                      </h3>
                    </div>
                    <span className="text-xs text-on-surface-variant">SERP Extrakt</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {DEFAULT_PAA.map((p) => {
                      const isOpen = Boolean(paaOpen[p.id]);
                      return (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl bg-surface-container-low border border-border-subtle space-y-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => togglePaa(p.id)}
                            className="w-full flex items-center justify-between text-left font-semibold text-on-surface hover:text-primary transition-colors"
                          >
                            <span>{p.question}</span>
                            <span
                              className={`material-symbols-outlined text-[18px] transition-transform ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            >
                              expand_more
                            </span>
                          </button>
                          {isOpen && (
                            <div className="pt-1 text-on-surface-variant leading-relaxed border-t border-border-subtle/80">
                              <p>{p.answerSnippet}</p>
                              <span className="text-[10px] text-google-green font-medium block mt-1">
                                ✓ {p.source}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. SÉMANTICKÉ ENTITY (LSI) & SHOPTET PRODUKTY (Viditeľná pri 'all' alebo 'entities') */}
          {(activeTab === "all" || activeTab === "entities") && (
            <section className="p-4 md:p-6 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-google-blue-bright text-[22px]">
                    hub
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-on-surface">
                      Sémantické Entity (LSI) & Prepojené Shoptet Produkty
                    </h3>
                    <span className="text-xs text-on-surface-variant">
                      Kľúčové entity pre Google algoritmus a priame nákupné karty pre čitateľov
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed/50 text-google-green text-xs font-bold">
                  Synchronizované
                </span>
              </div>

              {/* Entity Chips */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-on-surface-variant block">
                  Odporúčané LSI entity a minimálna hustota výskytu v texte:
                </span>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_LSI.map((ent) => (
                    <span
                      key={ent.name}
                      className="px-3 py-1.5 rounded-full bg-surface-container-low border border-border-subtle text-xs font-medium text-on-surface flex items-center gap-1.5 shadow-xs"
                    >
                      <span>{ent.name}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-primary-fixed text-primary text-[10px] font-bold">
                        {ent.count}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Shoptet Products Grid */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-on-surface block">
                  Prepojené produkty z katalógu Shoptet (Vloženie nákupného boxu do článku):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {DEFAULT_PRODUCTS.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col justify-between space-y-2.5 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                            {prod.category}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-full bg-secondary-fixed/50 text-google-green text-[10px] font-bold">
                            Skladom
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-on-surface mt-1 line-clamp-1">
                          {prod.name}
                        </h4>
                        <span className="text-sm font-bold text-on-surface block mt-0.5">
                          {prod.price}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => insertProductIntoBrief(prod.name)}
                        className="w-full py-1.5 px-2 rounded-lg bg-surface-pure border border-border-subtle text-xs font-semibold text-primary hover:bg-primary hover:text-on-primary transition-colors flex items-center justify-center gap-1 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[15px]">add_link</span>
                        <span>Vložiť do osnovy</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 9. PREPOJENIE S KALENDÁROM & FINÁLNY CTA BANNER */}
          <section className="p-4 md:p-6 rounded-2xl bg-gradient-to-br from-surface-pure via-surface-container-low/40 to-surface-pure border border-border-subtle shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">calendar_today</span>
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-bold text-on-surface">
                    Pripravené na zaradenie do publikačného plánu
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Odporúčaný slot v kalendári:{" "}
                    <strong className="text-on-surface font-semibold">
                      Piatok, 17. Október 2025 • 09:00
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleScheduleInCalendar}
                  className="px-4 py-2.5 rounded-full bg-surface-pure border border-border-subtle text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                  <span>Zaradiť do Kalendára</span>
                </button>

                <button
                  type="button"
                  onClick={handleLaunchRaketa}
                  className="px-5 py-2.5 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-primary transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                  <span>Odpáliť v SEO Rakete</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <CmsDeployDialog
        open={deployOpen}
        onOpenChange={setDeployOpen}
        initialContent={generatedBrief || "SEO Content Brief"}
        initialTitle={`Brief: ${topic}`}
      />
    </div>
  );
}
