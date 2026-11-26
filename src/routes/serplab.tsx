import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  HelpCircle,
  Laptop,
  Plus,
  RotateCcw,
  Search,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Zap,
  TrendingUp,
  Tag,
  ShieldCheck,
  RefreshCw,
  ShoppingCart,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useViewerRole } from "@/hooks/use-viewer-role";
import { PaywallModal } from "@/components/PaywallModal";

export const Route = createFileRoute("/serplab")({
  head: () => ({
    meta: [
      { title: "SerpLab Sandbox & SERP Simulátor — SEO4WEB" },
      {
        name: "description",
        content:
          "Simulujte vzhľad vašich výsledkov vo vyhľadávači Google v reálnom čase, optimalizujte rich snippety a generujte Schema.org JSON-LD.",
      },
      { property: "og:title", content: "SerpLab Sandbox — SEO4WEB" },
      {
        property: "og:description",
        content: "Simulácia Google SERP výsledkov a validátor rich snippetov.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SerpLabPage,
});

interface FaqItem {
  id: string;
  q: string;
  a: string;
}

const AI_CTR_SUGGESTIONS = [
  { label: "+ Zľava 15% + Doprava", text: " | Zľava 15% + Doprava" },
  { label: "+ Test & Recenzia 2025", text: " (Test 2025)" },
  { label: "+ Skladom ihneď", text: " [Skladom ihneď]" },
];

function SerpLabPage() {
  const { isAdmin, plan } = useViewerRole();
  const [paywallOpen, setPaywallOpen] = useState(false);

  // SERP Input Fields
  const [query, setQuery] = useState("bežecká obuv na asfalt asics gel nimbus");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [title, setTitle] = useState("Pánska bežecká obuv ASICS Gel-Nimbus 26 | Mojeshop.sk");
  const [description, setDescription] = useState(
    "Hľadáte prémiové tlmenie na tvrdý povrch? Objavte bežecké topánky ASICS Gel-Nimbus 26 skladom s doručením do 24h. Bezplatná výmena veľkosti a garancia originality.",
  );
  const [slug, setSlug] = useState("kategoria/bezecka-obuv-asics-gel-nimbus-26");

  // Rich Snippet Details
  const [price, setPrice] = useState("179,90");
  const [stock, setStock] = useState<"InStock" | "OutOfStock" | "PreOrder">("InStock");
  const [rating, setRating] = useState("4.9");
  const [reviews, setReviews] = useState("142");
  const [brand, setBrand] = useState("ASICS");
  const [ean, setEan] = useState("8718833918201");

  // FAQ Schema
  const [includeFaq, setIncludeFaq] = useState(true);
  const [faqList, setFaqList] = useState<FaqItem[]>([
    {
      id: "1",
      q: "Sú Gel-Nimbus 26 vhodné na maratón?",
      a: "Áno, vďaka pene FF BLAST™ PLUS ECO a gélovej technológii PureGEL® patria k najpohodlnejšej maratónskej obuvi s maximálnym tlmením nárazov na asfalte.",
    },
    {
      id: "2",
      q: "Ako sedí číslovanie topánok ASICS?",
      a: "Odporúčame zvoliť o pol čísla (0.5 EU) väčšiu veľkosť ako bežnú vychádzkovú obuv, aby mal palec pri dlhom behu dostatočnú rezervu.",
    },
  ]);

  // Tab switch in Preview column (SERP preview vs JSON-LD code)
  const [previewTab, setPreviewTab] = useState<"serp" | "jsonld">("serp");

  // Mobile navigation tabs
  const [mobileTab, setMobileTab] = useState<"serp" | "meta" | "schema" | "jsonld">("serp");

  // Title length & Pixel calculation (approx 9.5px per character in Arial 20px)
  const titleChars = title.length;
  const titlePixels = Math.round(titleChars * 9.5);
  const titleProgress = Math.min(100, Math.round((titleChars / 60) * 100));

  // Description length calculation
  const descChars = description.length;
  const descProgress = Math.min(100, Math.round((descChars / 155) * 100));

  // JSON-LD Generation
  const jsonLdCode = useMemo(() => {
    const schemaObj: Record<string, unknown> = {
      "@context": "https://schema.org/",
      "@graph": [
        {
          "@type": "Product",
          name: title.split("|")[0]?.trim() || title,
          description: description,
          brand: {
            "@type": "Brand",
            name: brand,
          },
          sku: ean,
          gtin13: ean,
          offers: {
            "@type": "Offer",
            url: `https://mojeshop.sk/${slug}`,
            priceCurrency: "EUR",
            price: price.replace(",", "."),
            priceValidUntil: "2026-12-31",
            availability: `https://schema.org/${stock}`,
            itemCondition: "https://schema.org/NewCondition",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount: reviews,
            bestRating: "5",
            worstRating: "1",
          },
        },
      ],
    };

    if (includeFaq && faqList.length > 0) {
      const graph = schemaObj["@graph"] as unknown[];
      graph.push({
        "@type": "FAQPage",
        mainEntity: faqList.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.a,
          },
        })),
      });
    }

    return JSON.stringify(schemaObj, null, 2);
  }, [title, description, slug, price, stock, rating, reviews, brand, ean, includeFaq, faqList]);

  const copyJsonLd = async () => {
    await navigator.clipboard.writeText(jsonLdCode);
    toast.success("Schema.org JSON-LD kód skopírovaný do schránky!");
  };

  const copyMetaTags = async () => {
    const metaSnippet = `<!-- Google SEO & Meta Snippet -->\n<title>${title}</title>\n<meta name="description" content="${description}">\n\n<script type="application/ld+json">\n${jsonLdCode}\n</script>`;
    await navigator.clipboard.writeText(metaSnippet);
    toast.success("Kompletné SEO meta tagy skopírované!");
  };

  const addFaq = () => {
    setFaqList((cur) => [
      ...cur,
      {
        id: String(Date.now()),
        q: "Nová často kladená otázka?",
        a: "Stručná a výstižná odpoveď pre zobrazenie v Google SERP.",
      },
    ]);
  };

  const removeFaq = (id: string) => {
    setFaqList((cur) => cur.filter((f) => f.id !== id));
  };

  const updateFaq = (id: string, field: "q" | "a", val: string) => {
    setFaqList((cur) => cur.map((f) => (f.id === id ? { ...f, [field]: val } : f)));
  };

  const handleAiPillClick = (textToAdd: string) => {
    if (!title.includes(textToAdd.trim())) {
      setTitle((prev) => prev.trim() + textToAdd);
      toast.success(`Pridaný AI akcelerátor CTR: ${textToAdd.trim()}`);
    } else {
      toast.info("Tento prvok už je v titulku zahrnutý");
    }
  };

  const handleReset = () => {
    setTitle("Pánska bežecká obuv ASICS Gel-Nimbus 26 | Mojeshop.sk");
    setDescription(
      "Hľadáte prémiové tlmenie na tvrdý povrch? Objavte bežecké topánky ASICS Gel-Nimbus 26 skladom s doručením do 24h. Bezplatná výmena veľkosti a garancia originality.",
    );
    setPrice("179,90");
    setRating("4.9");
    setReviews("142");
    setStock("InStock");
    toast.success("Údaje boli resetované na predvolenú simuláciu");
  };

  const scrollToMobileSection = (target: "serp" | "meta" | "schema" | "jsonld") => {
    setMobileTab(target);
    const el = document.getElementById(`${target}-section`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed-variant">
      <Toaster />
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-28 md:pb-16 space-y-6">
        {/* =========================================================================
            HEADER TITLE STRIP (DESKTOP + MOBILE COMMON)
            ========================================================================= */}
        <section className="bg-surface-pure rounded-2xl p-4 sm:p-5 shadow-xs border border-border-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-headline-sm text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                  SerpLab Sandbox
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
                  Google SERP v2025
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-google-green font-medium bg-[#E6F4EA] px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-google-green animate-pulse"></span>
                  Simulácia aktívna: Pozícia #1
                </span>
              </div>
              <p className="font-body-sm text-xs sm:text-sm text-text-secondary mt-0.5">
                Simulujte reálny vzhľad výsledkov v Google, optimalizujte pixelovú dĺžku a generujte
                validné Schema.org dáta.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              id="btn-refresh"
              variant="outline"
              size="sm"
              onClick={handleReset}
              title="Obnoviť predvolenú simuláciu"
              className="rounded-full h-9 px-3 text-xs text-text-secondary hover:text-text-primary border-border-default hover:bg-surface-container flex items-center gap-1"
            >
              <RefreshCw className="size-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyMetaTags}
              className="rounded-full h-9 px-3 sm:px-4 text-xs font-medium text-text-primary border-border-default hover:bg-surface-container flex items-center gap-1.5"
            >
              <Copy className="size-3.5" />
              <span className="hidden sm:inline">Kopírovať Meta Tagy</span>
              <span className="sm:hidden">Meta</span>
            </Button>
            <Button
              id="btn-quick-export"
              variant="studio"
              size="sm"
              onClick={copyJsonLd}
              className="rounded-full h-9 px-4 sm:px-5 text-xs font-bold bg-primary-container hover:bg-primary text-white flex items-center gap-1.5 shadow-xs"
            >
              <Code2 className="size-3.5" />
              <span>JSON-LD</span>
            </Button>
          </div>
        </section>

        {/* =========================================================================
            MOBILE-FIRST SECTION SWITCHER (VISIBLE ON MOBILE < LG)
            ========================================================================= */}
        <div className="lg:hidden flex flex-col gap-3">
          {/* Segmented Horizontal Pill Tabs */}
          <div className="flex items-center gap-1 p-1 bg-surface-container rounded-full overflow-x-auto no-scrollbar shadow-inner text-nowrap">
            <button
              type="button"
              onClick={() => scrollToMobileSection("serp")}
              className={`serp-tab flex-1 min-w-[110px] py-1.5 px-3 rounded-full text-xs transition-all text-center ${
                mobileTab === "serp"
                  ? "bg-surface-pure text-primary-container font-bold shadow-xs"
                  : "text-text-secondary hover:text-text-primary font-medium"
              }`}
            >
              SERP Náhľad
            </button>
            <button
              type="button"
              onClick={() => scrollToMobileSection("meta")}
              className={`serp-tab flex-1 min-w-[110px] py-1.5 px-3 rounded-full text-xs transition-all text-center ${
                mobileTab === "meta"
                  ? "bg-surface-pure text-primary-container font-bold shadow-xs"
                  : "text-text-secondary hover:text-text-primary font-medium"
              }`}
            >
              Meta & CTR
            </button>
            <button
              type="button"
              onClick={() => scrollToMobileSection("schema")}
              className={`serp-tab flex-1 min-w-[110px] py-1.5 px-3 rounded-full text-xs transition-all text-center ${
                mobileTab === "schema"
                  ? "bg-surface-pure text-primary-container font-bold shadow-xs"
                  : "text-text-secondary hover:text-text-primary font-medium"
              }`}
            >
              Schema.org
            </button>
            <button
              type="button"
              onClick={() => scrollToMobileSection("jsonld")}
              className={`serp-tab flex-1 min-w-[90px] py-1.5 px-3 rounded-full text-xs transition-all text-center ${
                mobileTab === "jsonld"
                  ? "bg-surface-pure text-primary-container font-bold shadow-xs"
                  : "text-text-secondary hover:text-text-primary font-medium"
              }`}
            >
              JSON-LD
            </button>
          </div>

          {/* Search Query Bar with Intent Pill */}
          <div className="bg-surface-pure rounded-2xl p-3.5 shadow-xs border border-border-subtle flex flex-col gap-3">
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-full shadow-inner">
              <Search className="size-4 text-text-secondary shrink-0" />
              <input
                type="text"
                aria-label="Hľadaný dotaz v náhľade Google"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs sm:text-sm text-text-primary font-medium focus:outline-none truncate"
                placeholder="Hľadaný dotaz..."
              />
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant text-[10px] font-bold tracking-wider shrink-0">
                GOOGLE.SK
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-container-low">
                <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center shrink-0 text-on-secondary-container">
                  <ShoppingCart className="size-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-text-secondary truncate">Zámer hľadania</span>
                  <span className="text-xs text-text-primary font-semibold truncate">
                    Transakčný zámer
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-container-low">
                <div className="w-7 h-7 rounded-full bg-primary-container/10 flex items-center justify-center shrink-0 text-primary-container">
                  <TrendingUp className="size-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-text-secondary truncate">
                    Organický potenciál
                  </span>
                  <span className="text-xs text-google-green font-semibold truncate">
                    Vysoký CTR
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            DESKTOP STUDIO 2-COLUMN GRID / MOBILE STACKED WITH SECTION ANCHORS
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Controls Column (Desktop Left 6-col / Mobile Stacked) */}
          <div className="lg:col-span-6 space-y-5">
            {/* Desktop-only Search Query Card */}
            <div className="hidden lg:block bg-surface-pure rounded-2xl p-5 shadow-xs border border-border-subtle space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <h2 className="font-title-md text-base font-bold text-text-primary">
                  Dopyt a vyhľadávacie prostredie
                </h2>
                <div className="flex items-center bg-surface-container-low p-1 rounded-full border border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setDevice("desktop")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      device === "desktop"
                        ? "bg-surface-pure text-primary shadow-xs"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Laptop className="size-3.5" /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevice("mobile")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      device === "mobile"
                        ? "bg-surface-pure text-primary shadow-xs"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Smartphone className="size-3.5" /> Mobil
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="input-target-query"
                  className="font-label-sm text-xs font-medium text-text-secondary block mb-1.5"
                >
                  Hľadaný výraz (Target Query)
                </label>
                <div className="relative">
                  <Search className="size-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-target-query"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-border-subtle rounded-full text-text-primary font-body-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container"
                  />
                </div>
              </div>
            </div>

            {/* SEKCIA: Meta Tagy & AI CTR Akcelerátor */}
            <div
              id="meta-section"
              className="bg-surface-pure rounded-2xl p-4 sm:p-5 shadow-xs border border-border-subtle space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-primary-container" />
                  <h2 className="font-title-md text-sm sm:text-base font-bold text-text-primary">
                    Meta Tagy & CTR Optimalizátor
                  </h2>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
                  AI Powered
                </span>
              </div>

              {/* Title Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="input-seo-title" className="font-semibold text-text-primary">
                    SEO Titulok (&lt;title&gt;)
                  </label>
                  <span
                    className={`font-mono font-medium ${
                      titleChars > 60 ? "text-google-red" : "text-google-green"
                    }`}
                  >
                    {titleChars} / 60 znakov ({titlePixels}px / 600px)
                  </span>
                </div>
                <div className="bg-surface-container-low rounded-xl p-2.5 flex items-center justify-between shadow-inner border border-border-subtle">
                  <input
                    id="input-seo-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent font-body-sm text-xs sm:text-sm text-text-primary focus:outline-none"
                  />
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      titleChars > 60 ? "bg-google-red" : "bg-google-green"
                    }`}
                    style={{ width: `${Math.min(100, (titlePixels / 600) * 100)}%` }}
                  />
                </div>
              </div>

              {/* AI CTR Suggestion Pills */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-text-secondary font-medium">
                  Kliknite pre pridanie AI CTR akcelerátorov:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {AI_CTR_SUGGESTIONS.map((pill) => (
                    <button
                      key={pill.label}
                      type="button"
                      onClick={() => handleAiPillClick(pill.text)}
                      className="ai-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container hover:bg-primary-fixed hover:text-on-primary-fixed text-text-primary text-xs transition-colors shadow-xs active:scale-95 border border-border-subtle"
                    >
                      <Zap className="size-3 text-primary-container" />
                      <span>{pill.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Field */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor="input-meta-description"
                    className="font-semibold text-text-primary"
                  >
                    Meta Popis (&lt;meta name="description"&gt;)
                  </label>
                  <span
                    className={`font-mono font-medium ${
                      descChars > 155 ? "text-google-red" : "text-google-green"
                    }`}
                  >
                    {descChars} / 155 znakov ({descChars <= 155 ? "Perfektná dĺžka" : "Príliš dlhý"}
                    )
                  </span>
                </div>
                <textarea
                  id="input-meta-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-surface-container-low rounded-xl p-2.5 font-body-sm text-xs sm:text-sm text-text-primary focus:outline-none resize-none shadow-inner leading-relaxed border border-border-subtle"
                />
                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      descChars > 155 ? "bg-google-red" : "bg-google-green"
                    }`}
                    style={{ width: `${descProgress}%` }}
                  />
                </div>
              </div>

              {/* URL Slug Field */}
              <div className="space-y-1 pt-1">
                <label htmlFor="input-url-slug" className="font-semibold text-xs text-text-primary">
                  URL Slug
                </label>
                <div className="flex items-center px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono">
                  <span className="text-text-secondary">https://mojeshop.sk/</span>
                  <input
                    id="input-url-slug"
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="bg-transparent text-primary font-medium focus:outline-none flex-1 ml-0.5"
                  />
                </div>
              </div>
            </div>

            {/* SEKCIA: Schema.org Rich Snippets Builder */}
            <div
              id="schema-section"
              className="bg-surface-pure rounded-2xl p-4 sm:p-5 shadow-xs border border-border-subtle space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-1.5">
                  <Tag className="size-4 text-primary-container" />
                  <h2 className="font-title-md text-sm sm:text-base font-bold text-text-primary">
                    Schema.org Snippets Builder
                  </h2>
                </div>
                <span className="font-label-sm text-xs text-text-secondary bg-surface-container-low px-2 py-0.5 rounded-full">
                  E-shop Typ
                </span>
              </div>

              {/* Feature Chips */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-xl bg-primary-fixed text-on-primary-fixed flex flex-col items-center text-center">
                  <Tag className="size-4" />
                  <span className="text-[11px] font-semibold mt-0.5">Produkt</span>
                </div>
                <div className="p-2 rounded-xl bg-surface-container-low text-text-primary flex flex-col items-center text-center">
                  <HelpCircle className="size-4 text-primary-container" />
                  <span className="text-[11px] font-semibold mt-0.5">FAQ Accordion</span>
                </div>
                <div className="p-2 rounded-xl bg-surface-container-low text-text-primary flex flex-col items-center text-center">
                  <Star className="size-4 text-google-yellow" />
                  <span className="text-[11px] font-semibold mt-0.5">Hodnotenie</span>
                </div>
              </div>

              {/* Product Inputs Grid */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label
                    htmlFor="input-price"
                    className="font-label-sm text-[11px] text-text-secondary block mb-1"
                  >
                    Cena (EUR)
                  </label>
                  <input
                    type="text"
                    id="input-price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary font-semibold text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="input-stock"
                    className="font-label-sm text-[11px] text-text-secondary block mb-1"
                  >
                    Sklad
                  </label>
                  <select
                    id="input-stock"
                    value={stock}
                    onChange={(e) =>
                      setStock(e.target.value as "InStock" | "OutOfStock" | "PreOrder")
                    }
                    className="w-full px-2 py-1.5 bg-surface-container-low border border-border-subtle rounded-xl text-google-green font-semibold text-xs focus:outline-none"
                  >
                    <option value="InStock">Skladom (&gt;5ks)</option>
                    <option value="OutOfStock">Vypredané</option>
                    <option value="PreOrder">Predobjednávka</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="input-rating"
                    className="font-label-sm text-[11px] text-text-secondary block mb-1"
                  >
                    Rating
                  </label>
                  <input
                    type="text"
                    id="input-rating"
                    value={`${rating} / ${reviews} rec.`}
                    onChange={(e) => {
                      const val = e.target.value.split("/")[0]?.trim();
                      if (val) setRating(val);
                    }}
                    className="w-full px-2.5 py-1.5 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary font-semibold text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="input-brand"
                    className="font-label-sm text-[11px] text-text-secondary block mb-1"
                  >
                    Značka (Brand)
                  </label>
                  <input
                    type="text"
                    id="input-brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="input-ean"
                    className="font-label-sm text-[11px] text-text-secondary block mb-1"
                  >
                    GTIN / EAN
                  </label>
                  <input
                    type="text"
                    id="input-ean"
                    value={ean}
                    onChange={(e) => setEan(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* FAQ Section */}
              <div className="pt-3 border-t border-border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-primary">
                    <input
                      type="checkbox"
                      checked={includeFaq}
                      onChange={(e) => setIncludeFaq(e.target.checked)}
                      className="rounded border-border-default text-primary focus:ring-primary size-4"
                    />
                    <span>Zahrnúť FAQ Rich Snippet (Zvyšuje výšku v Google o 40%)</span>
                  </label>
                  {includeFaq && (
                    <button
                      type="button"
                      onClick={addFaq}
                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 shrink-0"
                    >
                      <Plus className="size-3" /> Pridať
                    </button>
                  )}
                </div>

                {includeFaq && (
                  <div className="space-y-2">
                    {faqList.map((f, i) => (
                      <div
                        key={f.id}
                        className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-1 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-[10px] font-bold text-text-secondary">
                            Otázka #{i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFaq(f.id)}
                            className="text-text-secondary hover:text-google-red p-0.5"
                            title="Vymazať otázku"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                        <input
                          type="text"
                          aria-label="FAQ otázka"
                          value={f.q}
                          onChange={(e) => updateFaq(f.id, "q", e.target.value)}
                          className="w-full px-2.5 py-1 bg-surface-pure border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none"
                        />
                        <textarea
                          rows={2}
                          aria-label="FAQ odpoveď"
                          value={f.a}
                          onChange={(e) => updateFaq(f.id, "a", e.target.value)}
                          className="w-full px-2.5 py-1 bg-surface-pure border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none resize-none leading-normal"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Google SERP Preview & JSON-LD (Desktop Sticky / Mobile Stacked) */}
          <div className="lg:col-span-6 space-y-5 lg:sticky lg:top-20">
            {/* SEKCIA: SERP Náhľad Card */}
            <div
              id="serp-section"
              className="bg-surface-pure rounded-2xl p-4 sm:p-5 shadow-xs border border-border-subtle space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTab("serp")}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                      previewTab === "serp"
                        ? "bg-primary-container text-white shadow-xs"
                        : "bg-surface-container-low text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Google SERP Náhľad
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("jsonld")}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                      previewTab === "jsonld"
                        ? "bg-primary-container text-white shadow-xs"
                        : "bg-surface-container-low text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Schema.org JSON-LD
                  </button>
                </div>

                <span className="font-label-sm text-xs text-google-green bg-secondary-container px-2.5 py-0.5 rounded-full font-semibold">
                  Mobile First Index
                </span>
              </div>

              {previewTab === "serp" ? (
                <div className="space-y-4">
                  {/* Result Card 1: Target Site (Rank #1) */}
                  <div className="relative bg-surface-pure rounded-xl p-3.5 sm:p-4 border border-border-subtle shadow-md flex flex-col gap-2">
                    {/* Visual Accent Tag */}
                    <div className="flex items-center justify-between gap-1 pb-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-container text-white font-label-sm text-xs font-semibold shadow-xs">
                        <CheckCircle2 className="size-3" />
                        POZÍCIA #1 (Google Mobile)
                      </span>
                      <span className="font-label-sm text-xs text-google-green bg-surface-container px-2 py-0.5 rounded-full font-semibold">
                        CTR: 28.4% (+6.4% nad priemer)
                      </span>
                    </div>

                    {/* URL & Favicon Row */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
                        M
                      </div>
                      <div className="flex flex-col min-w-0 leading-tight">
                        <span className="text-xs text-text-primary font-medium">Mojeshop.sk</span>
                        <span className="text-[11px] text-text-secondary truncate font-mono">
                          https://mojeshop.sk › {slug}
                        </span>
                      </div>
                    </div>

                    {/* Title link */}
                    <a
                      href="#serp-click"
                      onClick={(e) => e.preventDefault()}
                      className="text-base sm:text-lg text-[#1a0dab] hover:underline font-semibold leading-snug tracking-tight break-words"
                    >
                      {title}
                    </a>

                    {/* Rich Snippet Metrics: Stars, Price, Stock */}
                    <div className="flex items-center gap-1.5 flex-wrap py-0.5 text-xs text-text-secondary">
                      <div className="inline-flex items-center text-google-yellow font-bold gap-0.5">
                        <span className="text-text-primary font-semibold mr-0.5">{rating}</span>
                        <Star className="size-3.5 fill-current" />
                        <Star className="size-3.5 fill-current" />
                        <Star className="size-3.5 fill-current" />
                        <Star className="size-3.5 fill-current" />
                        <Star className="size-3.5 fill-current" />
                      </div>
                      <span>({reviews} recenzií)</span>
                      <span>•</span>
                      <span className="font-semibold text-text-primary">{price} €</span>
                      <span>•</span>
                      <span className="text-google-green font-medium flex items-center gap-0.5">
                        <Check className="size-3" />
                        {stock === "InStock" ? "Na sklade" : "Dostupné"}
                      </span>
                    </div>

                    {/* Meta description snippet */}
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed break-words">
                      {description}
                    </p>

                    {/* Rich FAQ Accordion in SERP */}
                    {includeFaq && faqList.length > 0 && (
                      <div className="mt-1 pt-2 flex flex-col gap-1.5 bg-surface-container-low p-2.5 rounded-xl border border-border-subtle">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                            <HelpCircle className="size-3.5 text-primary-container" />
                            Google FAQ Snippet
                          </span>
                          <span className="text-[10px] text-google-green font-medium">
                            Validný markup
                          </span>
                        </div>

                        {faqList.map((item) => (
                          <details
                            key={item.id}
                            className="group bg-surface-pure rounded-lg p-2 transition-all border border-border-subtle"
                          >
                            <summary className="flex items-center justify-between text-xs font-medium text-text-primary cursor-pointer list-none">
                              <span className="pr-2">{item.q}</span>
                              <ChevronDown className="size-3.5 text-text-secondary group-open:rotate-180 transition-transform shrink-0" />
                            </summary>
                            <p className="text-[11px] text-text-secondary mt-1.5 pl-0.5 leading-normal">
                              {item.a}
                            </p>
                          </details>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Competitor Result (#2 - Contrast without rich snippets) */}
                  <div className="bg-surface-pure/75 rounded-xl p-3 sm:p-3.5 border border-border-subtle shadow-xs flex flex-col gap-1.5 opacity-90">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary font-medium">
                        Pozícia #2 • Konkurencia
                      </span>
                      <span className="text-[11px] text-google-red font-semibold bg-red-50 px-2 py-0.5 rounded-full">
                        Bez Rich Snippets
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-surface-container-highest flex items-center justify-center text-[10px] text-text-secondary font-bold">
                        S
                      </div>
                      <span className="text-xs text-text-secondary truncate font-mono">
                        https://www.sportisimo.sk › asics-nimbus
                      </span>
                    </div>
                    <span className="text-sm font-medium text-primary-container truncate">
                      ASICS GEL-NIMBUS - Bežecké topánky | Sportisimo.sk
                    </span>
                    <p className="text-xs text-text-secondary line-clamp-2">
                      Kúpte si ASICS GEL-NIMBUS za skvelé ceny na Sportisimo.sk. Rýchle doručenie,
                      široký výber bežeckej výbavy a vybavenia pre športovcov...
                    </p>
                  </div>
                </div>
              ) : null}

              {/* SEKCIA: JSON-LD Code Output Box */}
              {(previewTab === "jsonld" || mobileTab === "jsonld") && (
                <div
                  id="jsonld-section"
                  className="bg-inverse-surface rounded-2xl p-4 sm:p-5 shadow-md flex flex-col gap-3 text-inverse-on-surface"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Code2 className="size-4 text-primary-fixed" />
                      <span className="text-xs sm:text-sm font-semibold">
                        Schema.org JSON-LD Výstup
                      </span>
                    </div>
                    <span className="text-[11px] text-secondary-fixed bg-secondary/40 px-2.5 py-0.5 rounded-full font-semibold">
                      Validné (0 chýb / 0 varovaní)
                    </span>
                  </div>

                  <div className="relative bg-surface-container-lowest/5 rounded-xl p-3 overflow-x-auto max-h-[380px]">
                    <pre className="font-mono text-xs text-primary-fixed-dim leading-relaxed whitespace-pre font-normal select-all">
                      <code>{`<script type="application/ld+json">\n${jsonLdCode}\n</script>`}</code>
                    </pre>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-outline-variant">
                      Pripravené pre &lt;head&gt;
                    </span>
                    <Button
                      id="btn-copy-code"
                      size="sm"
                      onClick={copyJsonLd}
                      className="rounded-full bg-primary-container hover:bg-primary text-white text-xs font-semibold px-4 flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Copy className="size-3.5" />
                      <span id="copy-label">Kopírovať JSON-LD</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* SEKCIA: Impact & Benchmark Panel */}
            <div className="bg-surface-pure rounded-2xl p-4 sm:p-5 shadow-xs border border-border-subtle flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-text-primary">
                  Odhadovaný vplyv optimalizácie
                </span>
                <span className="text-xs text-primary-container font-medium">Mesačná prognóza</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-surface-container-low flex flex-col text-center">
                  <span className="text-[11px] text-text-secondary truncate">Odhadované CTR</span>
                  <span className="text-base sm:text-lg font-bold text-google-green mt-0.5">
                    28.4%
                  </span>
                  <span className="text-[10px] text-text-secondary">+6.4% gain</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-container-low flex flex-col text-center">
                  <span className="text-[11px] text-text-secondary truncate">Noví návštevníci</span>
                  <span className="text-base sm:text-lg font-bold text-primary-container mt-0.5">
                    +480
                  </span>
                  <span className="text-[10px] text-text-secondary">klikov / mes.</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-container-low flex flex-col text-center">
                  <span className="text-[11px] text-text-secondary truncate">Úspora Ads</span>
                  <span className="text-base sm:text-lg font-bold text-google-green mt-0.5">
                    ~312 €
                  </span>
                  <span className="text-[10px] text-text-secondary">ekvivalent CPC</span>
                </div>
              </div>

              {/* Mobile Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  onClick={() => toast.success("Konfigurácia bola pripravená na export do CMS")}
                  className="flex-1 rounded-full bg-primary-container hover:bg-primary text-white text-xs font-semibold h-10 shadow-xs"
                >
                  Uložiť do CMS / Shoptet
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.success("Žiadosť o reindexáciu odoslaná do Google Search Console API")
                  }
                  className="flex-1 rounded-full text-xs font-semibold h-10 border-border-default hover:bg-surface-container text-text-primary"
                >
                  Odoslať na GSC reindexáciu
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        title="Odomknite neobmedzený SerpLab Sandbox s balíkom Pro"
        description="V bezplatnej verzii môžete simulovať neobmedzene základný snippet. Pre automatickú synchronizáciu s WordPressom aktivujte balík Pro."
      />
    </div>
  );
}
