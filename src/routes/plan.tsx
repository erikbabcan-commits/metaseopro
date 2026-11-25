import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/use-auth";
import { useViewerRole } from "@/hooks/use-viewer-role";
import { generateContentPlan, checkContentPlanAccess } from "@/lib/content-plan.functions";
import { saveOutput } from "@/lib/outputs.functions";
import { startLaserProgress, stopLaserProgress } from "@/lib/laser-loader";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Obsahový Plán & Kalendár — SEO4WEB" },
      {
        name: "description",
        content:
          "Autonómny 30-dňový SEO obsahový kalendár a publikačný plán. Prepojenie na CMS Shoptet a WordPress.",
      },
      { property: "og:title", content: "Obsahový Plán & Kalendár — SEO4WEB" },
      {
        property: "og:description",
        content:
          "30-dňový publikačný plán, denná agenda, AI odporúčania a 1-klikové publikovanie do CMS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanPage,
});

type Access = {
  allowed: boolean;
  isFirstDay: boolean;
  generationsCount: number;
  firstUsedAt: string | null;
};

export type ArticleStatus = "published" | "ready" | "draft" | "empty";

export interface ScheduledArticle {
  id: string;
  day: number;
  dayOfWeek: string;
  dateStr: string;
  title: string;
  slug: string;
  category: string;
  status: ArticleStatus;
  priority: "P0" | "P1" | "P2";
  time: string;
  searchVolume: number;
  keywordDifficulty: number;
  serpTarget: string;
  trafficEst: string;
  savingsPpc: string;
  conversionRate: string;
  healthScore: number;
  lsiEntities: string[];
  product?: {
    name: string;
    price: string;
    sku: string;
    inStock: boolean;
  };
}

const INITIAL_ARTICLES: ScheduledArticle[] = [
  {
    id: "art-17",
    day: 17,
    dayOfWeek: "Pia",
    dateStr: "17. Október 2025",
    title: "Ako vybrať bežeckú obuv na asfalt: Veľký sprievodca",
    slug: "/poradna/bezecka-obuv-na-asfalt",
    category: "Pilierový sprievodca",
    status: "ready",
    priority: "P0",
    time: "09:00",
    searchVolume: 1420,
    keywordDifficulty: 34,
    serpTarget: "#1 – #3",
    trafficEst: "+1 240 / m",
    savingsPpc: "~340 € / m",
    conversionRate: "82%",
    healthScore: 94,
    lsiEntities: ["tlmenie došľapu 8x", "drop topánky 5x", "EVA pena 6x", "pronačná podpora 4x"],
    product: {
      name: "Nike Air Zoom Pegasus 40",
      price: "129,90 €",
      sku: "NK-PEG40-BK",
      inStock: true,
    },
  },
  {
    id: "art-14",
    day: 14,
    dayOfWeek: "Ut",
    dateStr: "14. Október 2025",
    title: "Kedy a ako správne dávkovať proteín pre maximálny efekt",
    slug: "/blog/davkovanie-proteinu",
    category: "Praktický návod",
    status: "published",
    priority: "P1",
    time: "14:00",
    searchVolume: 2800,
    keywordDifficulty: 24,
    serpTarget: "#1 – #2",
    trafficEst: "+2 100 / m",
    savingsPpc: "~410 € / m",
    conversionRate: "76%",
    healthScore: 96,
    lsiEntities: ["srvátkový izolát 6x", "časovanie bielkovín 4x", "regenerácia svalov 5x"],
  },
  {
    id: "art-24",
    day: 24,
    dayOfWeek: "Št",
    dateStr: "24. Október 2025",
    title: "Vitamín D3 a imunita na jeseň: Dávkovanie a zdroje",
    slug: "/poradna/vitamin-d3-imunita-jesen",
    category: "Sezónny trend",
    status: "draft",
    priority: "P1",
    time: "10:00",
    searchVolume: 4200,
    keywordDifficulty: 28,
    serpTarget: "#1 – #4",
    trafficEst: "+3 400 / m",
    savingsPpc: "~520 € / m",
    conversionRate: "88%",
    healthScore: 82,
    lsiEntities: ["dávkovanie IU 7x", "vstrebávanie s tukmi 4x", "slnečný vitamín 3x"],
    product: {
      name: "Vitamín D3 + K2 Premium Drops",
      price: "18,90 €",
      sku: "VIT-D3K2-DR",
      inStock: true,
    },
  },
  {
    id: "art-2",
    day: 2,
    dayOfWeek: "Št",
    dateStr: "2. Október 2025",
    title: "Prehľad najlepších kĺbových výživ pre bežcov 2025",
    slug: "/blog/najlepsie-klbove-vyzivy",
    category: "Porovnávací test",
    status: "published",
    priority: "P1",
    time: "11:00",
    searchVolume: 1950,
    keywordDifficulty: 31,
    serpTarget: "#2",
    trafficEst: "+980 / m",
    savingsPpc: "~260 € / m",
    conversionRate: "79%",
    healthScore: 92,
    lsiEntities: ["glukozamín sulfát 5x", "kolagén typu II 4x"],
  },
  {
    id: "art-21",
    day: 21,
    dayOfWeek: "Ut",
    dateStr: "21. Október 2025",
    title: "Kreatín monohydrát: Vedecky podložené fakty a mýty",
    slug: "/blog/kreatin-monohydrat-fakty",
    category: "Odborná analýza",
    status: "draft",
    priority: "P2",
    time: "13:30",
    searchVolume: 3100,
    keywordDifficulty: 22,
    serpTarget: "#2 – #5",
    trafficEst: "+1 650 / m",
    savingsPpc: "~310 € / m",
    conversionRate: "70%",
    healthScore: 78,
    lsiEntities: ["nasycovacia fáza 3x", "zadržiavanie vody 4x"],
  },
  {
    id: "art-28",
    day: 28,
    dayOfWeek: "Ut",
    dateStr: "28. Október 2025",
    title: "Regenerácia po maratóne: 5 overených tipov od fyzioterapeuta",
    slug: "/poradna/regeneracia-po-maratone",
    category: "Expert rady",
    status: "ready",
    priority: "P1",
    time: "09:30",
    searchVolume: 1250,
    keywordDifficulty: 19,
    serpTarget: "#1",
    trafficEst: "+890 / m",
    savingsPpc: "~180 € / m",
    conversionRate: "84%",
    healthScore: 95,
    lsiEntities: ["aktívna regenerácia 5x", "ľadový kúpeľ 3x", "kompresné podkolienky 4x"],
  },
];

const WEEK_DAYS = [
  { dayNum: 13, label: "Po", hasDot: false },
  { dayNum: 14, label: "Ut", hasDot: true, dotColor: "bg-google-green" },
  { dayNum: 15, label: "St", hasDot: false },
  { dayNum: 16, label: "Št", hasDot: false },
  { dayNum: 17, label: "Pia", hasDot: true, dotColor: "bg-google-blue-bright" },
  { dayNum: 18, label: "So", hasDot: false },
  { dayNum: 19, label: "Ne", hasDot: false },
];

function PlanPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useViewerRole();
  const checkAccess = useServerFn(checkContentPlanAccess);
  const generate = useServerFn(generateContentPlan);
  const save = useServerFn(saveOutput);

  // View state: 'week' (mobile agenda focus) | 'month' (desktop matrix) | 'generator' (AI creation)
  const [activeView, setActiveView] = useState<"week" | "month" | "generator">("week");

  // Selected Day & Article
  const [selectedDay, setSelectedDay] = useState<number>(17);
  const [articles, setArticles] = useState<ScheduledArticle[]>(INITIAL_ARTICLES);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // AI Generator Form State
  const [access, setAccess] = useState<Access | null>(null);
  const [niche, setNiche] = useState("Športová a bežecká obuv, fitness výživa");
  const [goal, setGoal] = useState(
    "Dominancia v organickom vyhľadávaní na Google.sk pre sezónu 2025",
  );
  const [extra, setExtra] = useState("Cieľová krajina Slovensko, prepojenie na e-shop Shoptet.");
  const [generatedPlan, setGeneratedPlan] = useState("");
  const [genStatus, setGenStatus] = useState<"idle" | "generating" | "done">("idle");

  // CMS Publishing simulation state
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { redirect: "/plan" } });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkAccess({})
        .then(setAccess)
        .catch(() => {});
    }
  }, [user, checkAccess]);

  const filteredArticles = useMemo(() => {
    if (categoryFilter === "all") return articles;
    return articles.filter((a) => a.category.toLowerCase().includes(categoryFilter.toLowerCase()));
  }, [articles, categoryFilter]);

  const selectedArticle = useMemo(() => {
    return (
      filteredArticles.find((a) => a.day === selectedDay) ||
      articles.find((a) => a.day === selectedDay) ||
      filteredArticles[0] ||
      articles[0]
    );
  }, [filteredArticles, articles, selectedDay]);

  const handlePublishCms = async (articleId: string) => {
    setPublishingId(articleId);
    await new Promise((r) => setTimeout(r, 750));
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, status: "published" as const } : a)),
    );
    setPublishingId(null);
    toast.success("Článok úspešne odoslaný do Shoptet CMS!");
  };

  const handleLaunchRaketa = (art: ScheduledArticle) => {
    toast.info(`Otváram SEO Raketu pre keyword: ${art.title}`);
    navigate({ to: "/raketa" });
  };

  const runAiGenerator = async () => {
    if (niche.trim().length < 2 || goal.trim().length < 2) {
      toast.error("Vyplň odvetvie (niche) aj cieľ.");
      return;
    }
    setGenStatus("generating");
    setGeneratedPlan("");
    startLaserProgress();
    try {
      const res = await generate({ data: { niche, goal, extra } });
      setGeneratedPlan(res.plan);
      setGenStatus("done");
      const a = await checkAccess({});
      setAccess(a);
      toast.success("30-dňový obsahový plán bol úspešne vygenerovaný!");
      try {
        await save({
          data: {
            type: "plan",
            title: `Obsahový plán: ${niche.trim()}`.slice(0, 200),
            input: { niche, goal, extra },
            output_markdown: res.plan,
          },
        });
      } catch (err) {
        console.error(err);
      }
    } catch (e) {
      const msg = (e as Error).message ?? "Chyba";
      if (msg.includes("PAYMENT_REQUIRED")) {
        toast.error("Tvoj prvý deň zdarma sa skončil. Predplatné bude čoskoro dostupné.");
        setAccess({
          ...(access ?? { generationsCount: 0, firstUsedAt: null }),
          allowed: false,
          isFirstDay: false,
        });
      } else {
        toast.error(msg);
      }
      setGenStatus("idle");
    } finally {
      stopLaserProgress();
    }
  };

  const copyPlanMarkdown = async () => {
    if (!generatedPlan) return;
    await navigator.clipboard.writeText(generatedPlan);
    toast.success("Plán skopírovaný do schránky.");
  };

  const downloadPlanMarkdown = () => {
    if (!generatedPlan) return;
    const blob = new Blob([generatedPlan], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo4web-obsahovy-plan-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Súbor stiahnutý.");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-sm text-on-surface-variant font-sans">
        Načítavam Obsahový Kalendár…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface flex flex-col pb-safe">
      <Toaster />
      <AppHeader />

      <main className="flex-1 w-full pt-16 pb-28 md:pb-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8 space-y-4">
          {/* 1. Podhlavička / Kontext domény a Hlavička kalendára */}
          <section className="flex flex-col pt-2 space-y-3">
            {/* Meta tagy & Integrácia CMS */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed/40 text-primary text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-google-blue-bright" />
                <span className="tracking-wide uppercase">OBSAHOVÝ KALENDÁR</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs">
                <span className="w-2 h-2 rounded-full bg-google-green animate-pulse" />
                <span>
                  CMS Shoptet:{" "}
                  <strong className="font-semibold text-on-surface">Aktívne v2.4</strong>
                </span>
              </div>
            </div>

            {/* Názov & Hlavné Akcie */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-on-surface">
                  Obsahový kalendár
                </h1>
                <p className="text-xs md:text-sm text-on-surface-variant mt-0.5">
                  30-dňový publikačný plán, distribúcia & automatické nasadzovanie do CMS
                </p>
              </div>

              {/* View Toggle Switcher & New Article CTA */}
              <div className="flex items-center gap-2">
                <div className="p-0.5 rounded-full bg-surface-container flex items-center text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveView("week")}
                    className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                      activeView === "week"
                        ? "bg-surface-pure text-on-surface shadow-xs font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Týždeň
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView("month")}
                    className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                      activeView === "month"
                        ? "bg-surface-pure text-on-surface shadow-xs font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Mesiac
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView("generator")}
                    className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                      activeView === "generator"
                        ? "bg-surface-pure text-primary shadow-xs font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    AI Plánovač
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveView("generator")}
                  className="px-4 py-2 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-primary transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Nový článok</span>
                </button>
              </div>
            </div>
          </section>

          {/* 2. Horizontálny KPI Prehľad */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* KPI 1 */}
            <div className="p-3.5 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Naplnenie slotov
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl md:text-2xl font-bold text-on-surface">14</span>
                  <span className="text-xs text-on-surface-variant">/ 16 slotov</span>
                </div>
              </div>
              <div className="mt-2.5">
                <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-google-blue-bright rounded-full w-[88%]" />
                </div>
                <span className="text-[10px] text-google-blue-bright font-medium mt-1 block">
                  88% mesačného plánu
                </span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="p-3.5 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Predikovaný dosah
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl md:text-2xl font-bold text-google-green">+12.4k</span>
                </div>
              </div>
              <div className="mt-1">
                <span className="text-[10px] text-google-green font-semibold">
                  ↑ +18% medzimesačne
                </span>
                <span className="text-[10px] text-on-surface-variant block mt-0.5">
                  nových organických návštev
                </span>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="p-3.5 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Pripravené na CMS
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl md:text-2xl font-bold text-on-surface">8</span>
                  <span className="text-xs text-on-surface-variant">článkov</span>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                <span className="px-1.5 py-0.2 rounded bg-secondary-fixed/50 text-google-green font-semibold">
                  3 publikované
                </span>
                <span className="px-1.5 py-0.2 rounded bg-surface-container font-medium">
                  3 koncepty
                </span>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="p-3.5 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Priemerné SEO skóre
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl md:text-2xl font-bold text-google-blue-bright">91%</span>
                  <span className="text-xs text-google-green font-medium">Excelentné</span>
                </div>
              </div>
              <span className="text-[10px] text-on-surface-variant block mt-1">
                Full E-E-A-T & LSI pokrytie
              </span>
            </div>
          </section>

          {/* 3. AI Prediktívne Odporúčanie (Google Assistant Callout) */}
          <section className="p-3.5 rounded-2xl bg-tertiary-fixed/30 border border-tertiary-fixed text-on-tertiary-fixed shadow-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-google-yellow/20 flex items-center justify-center shrink-0 text-google-yellow mt-0.5">
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lightbulb
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-on-tertiary-fixed">
                  AI Sezónny signál
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-google-yellow" />
                <span className="text-[11px] text-google-green font-semibold">+85% dopyt</span>
              </div>
              <p className="text-xs text-on-tertiary-fixed mt-1 leading-snug">
                Vysoký nárast pre <strong>„vitamín d3 imunita jeseň“</strong> (4 200/mes.). Slot na
                24. Október je pripravený v stave koncept.
              </p>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDay(24)}
                  className="text-xs font-semibold text-primary-container hover:underline inline-flex items-center gap-1"
                >
                  <span>Zobraziť slot 24. Okt</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </section>

          {/* 4. AI 30-DŇOVÝ GENERÁTOR (Keď je aktívny mód generator) */}
          {activeView === "generator" && (
            <section className="p-4 md:p-6 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    auto_awesome
                  </span>
                  <h2 className="text-base font-semibold text-on-surface">
                    AI Generátor 30-dňového obsahového plánu
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {access && access.isFirstDay && access.allowed && (
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed/50 text-google-green text-[11px] font-semibold">
                      Prvý deň zdarma
                    </span>
                  )}
                  <span className="text-xs text-on-surface-variant">
                    Mistral AI Enterprise Model
                  </span>
                </div>
              </div>

              {access && !access.allowed && !isAdmin && (
                <div className="p-3.5 rounded-xl bg-error-container/30 border border-error-container text-on-error-container flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-google-red text-[18px]">
                      lock
                    </span>
                    <span>
                      Tvoj prvý deň zdarma sa skončil. Pre ďalšie generovanie 30-dňového plánu
                      aktivuj predplatné.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/settings/agency" })}
                    className="px-3.5 py-1.5 rounded-full bg-surface-pure border border-border-subtle font-semibold text-primary hover:bg-surface-container-low transition-colors shadow-xs"
                  >
                    Aktivovať predplatné
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Niche / Odvetvie e-shopu *
                  </label>
                  <input
                    type="text"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    disabled={genStatus === "generating"}
                    placeholder="napr. Bežecká obuv a športová výživa"
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-border-default text-xs text-on-surface focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Hlavný SEO a biznis cieľ *
                  </label>
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    disabled={genStatus === "generating"}
                    placeholder="napr. TOP 3 pozície na Google SK a zvýšenie konverzií"
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-border-default text-xs text-on-surface focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Doplňujúce informácie a požiadavky (Voliteľné)
                  </label>
                  <input
                    type="text"
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                    disabled={genStatus === "generating"}
                    placeholder="napr. Slovenský trh, CMS Shoptet, prioritné kategórie obuv na asfalt a maratón"
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-border-default text-xs text-on-surface focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveView("week")}
                  className="px-4 py-2 rounded-full text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Naspäť do kalendára
                </button>

                <button
                  type="button"
                  onClick={runAiGenerator}
                  disabled={
                    genStatus === "generating" || (access !== null && !access.allowed && !isAdmin)
                  }
                  className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-xs font-semibold flex items-center gap-2 shadow-xs hover:bg-primary-container transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {genStatus === "generating"
                      ? "hourglass_top"
                      : access !== null && !access.allowed && !isAdmin
                        ? "lock"
                        : "auto_awesome"}
                  </span>
                  <span>
                    {genStatus === "generating"
                      ? "Generujem 30-dňový plán…"
                      : access !== null && !access.allowed && !isAdmin
                        ? "Predplatné vyžadované"
                        : "Vygenerovať 30-dňový plán"}
                  </span>
                </button>
              </div>

              {/* Generated Plan Output Container */}
              {generatedPlan && (
                <div className="mt-4 p-4 rounded-xl bg-surface-container-low border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                    <span className="text-xs font-semibold text-on-surface">
                      Výsledok generovania:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={copyPlanMarkdown}
                        className="px-3 py-1 rounded-full bg-surface-pure border border-border-subtle text-xs font-medium text-on-surface hover:bg-surface-container transition-colors shadow-xs"
                      >
                        Kopírovať
                      </button>
                      <button
                        type="button"
                        onClick={downloadPlanMarkdown}
                        className="px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold shadow-xs hover:bg-primary transition-colors"
                      >
                        Stiahnuť .md
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto text-xs leading-relaxed prose prose-xs max-w-none text-on-surface">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedPlan}</ReactMarkdown>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 5. TÝŽDENNÝ PÁSIK & DENNÁ AGENDA (Keď je aktívny mód week) */}
          {activeView === "week" && (
            <div className="space-y-4">
              {/* Týždenný Horizontálny Kalendárový Strip (Swipeable Week View) */}
              <section className="p-3 md:p-4 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="font-semibold text-on-surface">Október 2025 • Týždeň 42</span>
                  <span className="text-on-surface-variant text-[11px]">Dnes: Piatok 17. Okt</span>
                </div>

                {/* 7 Dní v Týždni */}
                <div className="grid grid-cols-7 gap-1 md:gap-2">
                  {WEEK_DAYS.map((w) => {
                    const isSelected = selectedDay === w.dayNum;
                    return (
                      <button
                        key={w.dayNum}
                        type="button"
                        onClick={() => setSelectedDay(w.dayNum)}
                        className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? "bg-primary text-on-primary shadow-xs font-bold"
                            : "bg-surface-container-low hover:bg-surface-container text-on-surface"
                        }`}
                      >
                        <span
                          className={`text-[10px] uppercase font-semibold ${
                            isSelected ? "text-on-primary/80" : "text-on-surface-variant"
                          }`}
                        >
                          {w.label}
                        </span>
                        <span className="text-sm md:text-base font-bold mt-0.5">{w.dayNum}</span>
                        <div className="h-1.5 flex items-center justify-center mt-1">
                          {w.hasDot ? (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? "bg-on-primary" : w.dotColor
                              }`}
                            />
                          ) : (
                            <span className="w-1.5 h-1.5" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Denná Agenda Článkov & Publikačný Plán */}
              <section className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-on-surface text-sm">
                      Agenda: {selectedArticle.dateStr}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-google-blue-bright" />
                  </div>
                  <span className="text-on-surface-variant text-[11px]">
                    Prioritná úloha v týždni
                  </span>
                </div>

                {/* Karta Vybraného Článku (Hlavný Focus) */}
                <article className="p-4 md:p-6 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs space-y-3.5 relative overflow-hidden">
                  {/* Akcentový bočný indikátor */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-container" />

                  {/* Hlavička karty článku */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pl-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-google-blue-bright/10 text-primary text-xs font-bold inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>
                          {selectedArticle.status === "published"
                            ? "PUBLIKOVANÉ"
                            : `PLÁNOVANÉ • ${selectedArticle.time}`}
                        </span>
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-error-container text-google-red text-[11px] font-bold">
                        {selectedArticle.priority} Priorita
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-medium">
                        {selectedArticle.category}
                      </span>
                    </div>

                    <span className="text-xs text-on-surface-variant font-medium">
                      Audit pripravenosti:{" "}
                      <strong className="text-google-green">{selectedArticle.healthScore}%</strong>
                    </span>
                  </div>

                  {/* Názov & URL */}
                  <div className="pl-1">
                    <h2 className="text-base md:text-lg font-bold text-on-surface tracking-tight">
                      {selectedArticle.title}
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mt-1">
                      <span className="material-symbols-outlined text-[15px]">link</span>
                      <span className="font-mono truncate">{selectedArticle.slug}</span>
                    </div>
                  </div>

                  {/* SEO Metriky v mriežke */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 pl-1">
                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle">
                      <span className="text-[10px] font-semibold text-on-surface-variant uppercase block">
                        Mesačná Hľadanosť
                      </span>
                      <span className="text-sm font-bold text-on-surface mt-0.5 block">
                        {selectedArticle.searchVolume} / mes.
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle">
                      <span className="text-[10px] font-semibold text-on-surface-variant uppercase block">
                        Náročnosť (KD)
                      </span>
                      <span className="text-sm font-bold text-google-green mt-0.5 block">
                        {selectedArticle.keywordDifficulty}% Ľahká
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle">
                      <span className="text-[10px] font-semibold text-on-surface-variant uppercase block">
                        Nákupný Zámer
                      </span>
                      <span className="text-sm font-bold text-google-yellow mt-0.5 block">
                        {selectedArticle.conversionRate}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle">
                      <span className="text-[10px] font-semibold text-on-surface-variant uppercase block">
                        Predikcia SERP
                      </span>
                      <span className="text-sm font-bold text-google-blue-bright mt-0.5 block">
                        {selectedArticle.serpTarget}
                      </span>
                    </div>
                  </div>

                  {/* LSI Kľúčové slová & Prepojený Produkt */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 pl-1">
                    {/* LSI Entity */}
                    <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle space-y-1.5">
                      <span className="text-[11px] font-semibold text-on-surface-variant block">
                        LSI kľúčové slová a hustota:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedArticle.lsiEntities.map((lsi) => (
                          <span
                            key={lsi}
                            className="px-2 py-0.5 rounded-full bg-surface-pure border border-border-subtle text-[11px] font-medium text-on-surface"
                          >
                            {lsi}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Prepojený e-shop produkt */}
                    {selectedArticle.product && (
                      <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                            Prepojený E-shop Produkt
                          </span>
                          <span className="text-xs font-semibold text-on-surface mt-0.5 block">
                            {selectedArticle.product.name}
                          </span>
                          <span className="text-xs font-bold text-on-surface mt-0.5 block">
                            {selectedArticle.product.price}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-fixed/50 text-google-green text-[10px] font-bold">
                          Skladom
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Workflow Akčné Tlačidlá */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 pl-1 border-t border-border-subtle">
                    <button
                      type="button"
                      disabled={
                        selectedArticle.status === "published" ||
                        publishingId === selectedArticle.id
                      }
                      onClick={() => handlePublishCms(selectedArticle.id)}
                      className={`flex-1 py-2.5 px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] ${
                        selectedArticle.status === "published"
                          ? "bg-secondary-container text-google-green border border-secondary-fixed cursor-default"
                          : "bg-google-green text-on-primary hover:opacity-95"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {publishingId === selectedArticle.id
                          ? "hourglass_top"
                          : selectedArticle.status === "published"
                            ? "check_circle"
                            : "send_and_archive"}
                      </span>
                      <span>
                        {publishingId === selectedArticle.id
                          ? "Odosielam do CMS…"
                          : selectedArticle.status === "published"
                            ? "Publikované v Shoptet ✓"
                            : "1-Click Publikovať Shoptet"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLaunchRaketa(selectedArticle)}
                      className="py-2.5 px-4 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-primary transition-colors active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                      <span>Odpáliť v SEO Rakete</span>
                    </button>
                  </div>
                </article>

                {/* Sekcia Ostatné dni v týždni / Ďalšie sloty */}
                <div className="pt-2 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-on-surface-variant block">
                      Ďalšie sloty v týždni a mesiaci:
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {["all", "sprievodca", "návod", "trend"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategoryFilter(cat)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                            categoryFilter === cat
                              ? "bg-primary text-on-primary font-semibold"
                              : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          {cat === "all" ? "Všetky" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {filteredArticles
                      .filter((a) => a.id !== selectedArticle.id)
                      .slice(0, 3)
                      .map((art) => (
                        <div
                          key={art.id}
                          onClick={() => setSelectedDay(art.day)}
                          className="p-3 rounded-xl bg-surface-pure border border-border-subtle shadow-xs flex items-center justify-between cursor-pointer hover:bg-surface-container-low transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 h-8 rounded-full bg-surface-container text-on-surface font-bold text-xs flex items-center justify-center shrink-0">
                              {art.day}
                            </span>
                            <div className="min-w-0 truncate">
                              <h4 className="text-xs font-semibold text-on-surface truncate">
                                {art.title}
                              </h4>
                              <span className="text-[11px] text-on-surface-variant block mt-0.5">
                                {art.category} • {art.searchVolume} / mes.
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                art.status === "published"
                                  ? "bg-secondary-fixed/50 text-google-green"
                                  : art.status === "ready"
                                    ? "bg-primary-fixed/50 text-primary"
                                    : "bg-surface-container text-on-surface-variant"
                              }`}
                            >
                              {art.status === "published"
                                ? "Publikované"
                                : art.status === "ready"
                                  ? "Pripravené"
                                  : "Koncept"}
                            </span>
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                              chevron_right
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* 6. DESKTOP MESAČNÁ MATICA & DETAIL INSPECTOR (Keď je aktívny mód month) */}
          {activeView === "month" && (
            <div className="space-y-4">
              {/* Controls bar: Month switcher & filters */}
              <div className="p-3 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-surface-container-low rounded-full p-1 border border-border-subtle">
                    <button
                      type="button"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <span className="px-3 font-semibold text-on-surface">Október 2025</span>
                    <button
                      type="button"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDay(17)}
                    className="px-3 py-1 rounded-full text-primary font-semibold hover:bg-surface-container-low transition-colors"
                  >
                    Dnes (17. Okt)
                  </button>
                </div>

                {/* Filter chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {["all", "sprievodca", "návod", "trend"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                        categoryFilter === cat
                          ? "bg-primary text-on-primary font-semibold"
                          : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {cat === "all"
                        ? "Všetky kategórie"
                        : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Compact Month List (< 768px) */}
              <div className="md:hidden space-y-2">
                {filteredArticles.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-surface-pure border border-border-subtle text-center text-xs text-on-surface-variant">
                    Pre vybraný filter kategórie sa nenašli žiadne články.
                  </div>
                ) : (
                  [...filteredArticles]
                    .sort((a, b) => a.day - b.day)
                    .map((art) => {
                      const isSelected = selectedDay === art.day;
                      return (
                        <button
                          key={art.id}
                          type="button"
                          onClick={() => setSelectedDay(art.day)}
                          className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-primary-fixed/20 border-primary-container shadow-xs"
                              : "bg-surface-pure border-border-subtle hover:bg-surface-container-low"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-9 h-9 rounded-xl font-bold text-xs flex flex-col items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-primary text-on-primary"
                                  : "bg-surface-container text-on-surface"
                              }`}
                            >
                              <span>{art.day}</span>
                              <span className="text-[9px] font-normal uppercase opacity-80">
                                {art.dayOfWeek}
                              </span>
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-on-surface truncate">
                                {art.title}
                              </h4>
                              <span className="text-[11px] text-on-surface-variant block mt-0.5">
                                {art.category} • {art.time}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              art.status === "published"
                                ? "bg-secondary-fixed/50 text-google-green"
                                : art.status === "ready"
                                  ? "bg-primary-fixed/50 text-primary"
                                  : "bg-surface-container text-on-surface-variant"
                            }`}
                          >
                            {art.status === "published"
                              ? "Publikované"
                              : art.status === "ready"
                                ? "Pripravené"
                                : "Koncept"}
                          </span>
                        </button>
                      );
                    })
                )}
              </div>

              {/* Desktop Matrix Grid: 7 Columns (>= 768px) */}
              <div className="hidden md:block rounded-2xl bg-surface-pure border border-border-subtle shadow-xs overflow-hidden">
                <div className="grid grid-cols-7 border-b border-border-subtle bg-surface-container-low text-center text-xs font-semibold text-on-surface-variant py-2">
                  <span>Pondelok</span>
                  <span>Utorok</span>
                  <span>Streda</span>
                  <span>Štvrtok</span>
                  <span>Piatok</span>
                  <span>Sobota</span>
                  <span>Nedeľa</span>
                </div>

                {/* Days 5 weeks preview */}
                <div className="grid grid-cols-7 auto-rows-[110px] divide-x divide-y divide-border-subtle text-xs">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                    const art = filteredArticles.find((a) => a.day === d);
                    const isSelected = selectedDay === d;
                    return (
                      <div
                        key={d}
                        onClick={() => setSelectedDay(d)}
                        className={`p-1.5 md:p-2 flex flex-col justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary-fixed/20 ring-2 ring-primary-container inset-0 z-10"
                            : "hover:bg-surface-container-low/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                              d === 17
                                ? "bg-primary text-on-primary"
                                : isSelected
                                  ? "font-bold text-primary"
                                  : "text-on-surface-variant"
                            }`}
                          >
                            {d}
                          </span>
                          {art && (
                            <span
                              className={`w-2 h-2 rounded-full ${
                                art.status === "published"
                                  ? "bg-google-green"
                                  : art.status === "ready"
                                    ? "bg-google-blue-bright"
                                    : "bg-google-yellow"
                              }`}
                            />
                          )}
                        </div>

                        {art && (
                          <div className="p-1 rounded bg-surface-container-low border border-border-subtle/80 text-[10px] leading-tight truncate">
                            <span className="font-semibold text-on-surface truncate block">
                              {art.title}
                            </span>
                            <span className="text-on-surface-variant text-[9px] block">
                              {art.status === "published"
                                ? "Publikované"
                                : art.status === "ready"
                                  ? "Pripravené"
                                  : "Koncept"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detail Inspector Panel for Selected Day */}
              <div className="p-4 md:p-6 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary-fixed text-primary text-xs font-bold inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">event_available</span>
                      <span>Vybraný detail: {selectedArticle.dateStr}</span>
                    </span>
                    <span className="text-xs font-semibold text-on-surface">
                      {selectedArticle.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={selectedArticle.status === "published"}
                      onClick={() => handlePublishCms(selectedArticle.id)}
                      className="px-4 py-1.5 rounded-full bg-google-green text-on-primary text-xs font-semibold shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50"
                    >
                      {selectedArticle.status === "published"
                        ? "Publikované v CMS ✓"
                        : "Publikovať do Shoptet"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunchRaketa(selectedArticle)}
                      className="px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold shadow-xs hover:bg-primary transition-colors"
                    >
                      Otvoriť v SEO Rakete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="md:col-span-2 space-y-2">
                    <h3 className="text-base font-bold text-on-surface">{selectedArticle.title}</h3>
                    <p className="text-on-surface-variant font-mono">{selectedArticle.slug}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedArticle.lsiEntities.map((lsi) => (
                        <span
                          key={lsi}
                          className="px-2 py-0.5 rounded-full bg-surface-container-low border border-border-subtle text-[11px] font-medium"
                        >
                          {lsi}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle space-y-1.5">
                    <span className="text-[10px] font-semibold text-on-surface-variant uppercase block">
                      Metriky a potenciál:
                    </span>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Hľadanosť:</span>
                      <span className="font-bold text-on-surface">
                        {selectedArticle.searchVolume} / m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Náročnosť:</span>
                      <span className="font-bold text-google-green">
                        {selectedArticle.keywordDifficulty}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Odhad návštev:</span>
                      <span className="font-bold text-google-blue-bright">
                        {selectedArticle.trafficEst}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Úspora PPC:</span>
                      <span className="font-bold text-google-green">
                        {selectedArticle.savingsPpc}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
