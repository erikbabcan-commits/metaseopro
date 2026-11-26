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

function SerpLabPage() {
  const { isAdmin, plan } = useViewerRole();
  const [paywallOpen, setPaywallOpen] = useState(false);

  // SERP Input Fields
  const [query, setQuery] = useState("bežecká obuv na asfalt asics gel nimbus");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [title, setTitle] = useState("Pánska bežecká obuv ASICS Gel-Nimbus 26 | Mojeshop.sk");
  const [description, setDescription] = useState(
    "Hľadáte prémiové tlmenie na tvrdý povrch? Objavte bežecké topánky ASICS Gel-Nimbus 26 skladom. Rýchle doručenie do 24 hodín a výmena veľkosti zadarmo.",
  );
  const [slug, setSlug] = useState("bezecka-obuv/asics-gel-nimbus-26");

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
      q: "Sú Gel-Nimbus 26 vhodné aj pre začiatočníkov?",
      a: "Áno, vďaka masívnemu PureGEL tlmeniu a pene FF BLAST PLUS ECO poskytujú maximálnu ochranu kĺbov aj pri pomalom tempe.",
    },
    {
      id: "2",
      q: "Aká je reálna životnosť podrážky?",
      a: "Kombinácia gúm ASICSGRIP a AHARPLUS garantuje výdrž minimálne 800 až 1 000 odbehnutých kilometrov na asfalte.",
    },
  ]);

  // Tab switch in Preview column (SERP preview vs JSON-LD code)
  const [previewTab, setPreviewTab] = useState<"serp" | "jsonld">("serp");

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

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed-variant">
      <Toaster />
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-28 md:pb-16 space-y-6">
        {/* Header Title Bar */}
        <section className="bg-surface-pure rounded-2xl p-4 sm:p-5 shadow-xs border border-border-subtle flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline-sm text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                  SerpLab Sandbox & SERP Simulátor
                </h1>
                <span className="inline-flex items-center gap-1 text-xs text-google-green font-medium bg-[#E6F4EA] px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-google-green animate-pulse"></span>
                  Pozícia #1
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                Simulujte reálny vzhľad výsledkov v Google, optimalizujte pixelovú dĺžku a generujte
                validné Schema.org dáta.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={copyMetaTags}
              className="rounded-full h-10 px-4 font-label-md text-label-md text-text-primary border-border-default hover:bg-surface-container flex items-center gap-1.5"
            >
              <Copy className="size-4" />
              <span>Kopírovať Meta Tagy</span>
            </Button>
            <Button
              variant="studio"
              onClick={copyJsonLd}
              className="rounded-full h-10 px-5 font-label-md text-label-md font-bold bg-primary-container hover:bg-primary text-white flex items-center gap-1.5 shadow-xs"
            >
              <Code2 className="size-4" />
              <span>Exportovať JSON-LD</span>
            </Button>
          </div>
        </section>

        {/* 2-Column Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-6 space-y-5">
            {/* Target Query Card */}
            <div className="bg-surface-pure rounded-2xl p-5 shadow-xs border border-border-subtle space-y-4">
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
                <label className="font-label-sm text-xs font-medium text-text-secondary block mb-1.5">
                  Hľadaný výraz (Target Query)
                </label>
                <div className="relative">
                  <Search className="size-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-border-subtle rounded-full text-text-primary font-body-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container"
                  />
                </div>
              </div>
            </div>

            {/* Meta Tags & Snippet Text Card */}
            <div className="bg-surface-pure rounded-2xl p-5 shadow-xs border border-border-subtle space-y-4">
              <h2 className="font-title-md text-base font-bold text-text-primary pb-3 border-b border-border-subtle">
                Meta Tagy & Text Snippetu
              </h2>

              {/* Title Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-text-primary">SEO Title</label>
                  <span
                    className={`font-mono font-medium ${
                      titleChars > 60 ? "text-google-red" : "text-google-green"
                    }`}
                  >
                    {titleChars} / 60 znakov ({titlePixels}px / 600px)
                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary font-body-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container"
                />
                <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      titleChars > 60 ? "bg-google-red" : "bg-google-green"
                    }`}
                    style={{ width: `${titleProgress}%` }}
                  />
                </div>
              </div>

              {/* Description Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-text-primary">Meta Description</label>
                  <span
                    className={`font-mono font-medium ${
                      descChars > 160 ? "text-google-red" : "text-google-green"
                    }`}
                  >
                    {descChars} / 155 znakov
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary font-body-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container resize-none"
                />
                <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      descChars > 160 ? "bg-google-red" : "bg-google-green"
                    }`}
                    style={{ width: `${descProgress}%` }}
                  />
                </div>
              </div>

              {/* URL Slug Field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary text-xs block">
                  URL Adresa (Breadcrumb)
                </label>
                <div className="flex items-center px-3.5 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono">
                  <span className="text-text-secondary select-none">https://mojeshop.sk/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="bg-transparent text-primary font-medium focus:outline-none flex-1 ml-0.5"
                  />
                </div>
              </div>
            </div>

            {/* Rich Snippets & Schema Fields Card */}
            <div className="bg-surface-pure rounded-2xl p-5 shadow-xs border border-border-subtle space-y-4">
              <h2 className="font-title-md text-base font-bold text-text-primary pb-3 border-b border-border-subtle">
                Rich Snippets (Produkt & Sklad & Recenzie)
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label-sm text-xs text-text-secondary block mb-1">
                    Cena (€)
                  </label>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary font-body-sm text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-xs text-text-secondary block mb-1">
                    Dostupnosť
                  </label>
                  <select
                    value={stock}
                    onChange={(e) =>
                      setStock(e.target.value as "InStock" | "OutOfStock" | "PreOrder")
                    }
                    className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary font-body-sm text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="InStock">Skladom (InStock)</option>
                    <option value="OutOfStock">Vypredané (OutOfStock)</option>
                    <option value="PreOrder">Predobjednávka (PreOrder)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label-sm text-xs text-text-secondary block mb-1">
                    Hodnotenie (0 - 5)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary font-body-sm text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-xs text-text-secondary block mb-1">
                    Počet recenzií
                  </label>
                  <input
                    type="number"
                    value={reviews}
                    onChange={(e) => setReviews(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary font-body-sm text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label-sm text-xs text-text-secondary block mb-1">
                    Značka (Brand)
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary font-body-sm text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-xs text-text-secondary block mb-1">
                    GTIN / EAN
                  </label>
                  <input
                    type="text"
                    value={ean}
                    onChange={(e) => setEan(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary font-body-sm text-xs focus:outline-none"
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
                    Zahrnúť FAQ Rich Snippet (Rozšírené otázky v Google)
                  </label>
                  {includeFaq && (
                    <button
                      type="button"
                      onClick={addFaq}
                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="size-3" /> Pridať otázku
                    </button>
                  )}
                </div>

                {includeFaq && (
                  <div className="space-y-2.5">
                    {faqList.map((f, i) => (
                      <div
                        key={f.id}
                        className="p-3 rounded-xl bg-surface-container-low border border-border-subtle space-y-1.5 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-[11px] font-bold text-text-secondary">
                            Otázka #{i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFaq(f.id)}
                            className="text-text-secondary hover:text-google-red p-0.5"
                            title="Vymazať otázku"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={f.q}
                          onChange={(e) => updateFaq(f.id, "q", e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-surface-pure border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none"
                        />
                        <textarea
                          rows={2}
                          value={f.a}
                          onChange={(e) => updateFaq(f.id, "a", e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-surface-pure border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none resize-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Google SERP Preview & JSON-LD */}
          <div className="lg:col-span-6 space-y-5 sticky top-20">
            <div className="bg-surface-pure rounded-2xl p-5 sm:p-6 shadow-xs border border-border-subtle space-y-4">
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

                <span className="font-label-sm text-xs text-text-secondary font-medium">
                  Googlebot Rank #1 Simulator
                </span>
              </div>

              {previewTab === "serp" ? (
                <div className="space-y-4">
                  {/* Google Web Search Mock Container */}
                  <div
                    className={`p-5 rounded-2xl bg-white border border-border-subtle shadow-xs transition-all ${
                      device === "mobile" ? "max-w-[390px] mx-auto" : "w-full"
                    }`}
                  >
                    {/* Breadcrumbs & Favicon */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-full bg-[#E8F0FE] flex items-center justify-center text-primary shrink-0 text-xs font-bold">
                        M
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] leading-tight text-[#202124] font-medium truncate">
                          Mojeshop.sk
                        </span>
                        <span className="text-[11px] leading-tight text-[#5f6368] truncate font-mono">
                          https://mojeshop.sk › {slug}
                        </span>
                      </div>
                    </div>

                    {/* Blue Title Link */}
                    <h3 className="text-[19px] sm:text-[20px] leading-snug font-medium text-[#1a0dab] hover:underline cursor-pointer break-words mb-1.5">
                      {title}
                    </h3>

                    {/* Star Rating & Price Rich Snippets */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#4d5156] mb-2 font-sans">
                      <div className="flex items-center text-[#e37400]">
                        <Star className="size-3.5 fill-current" />
                        <Star className="size-3.5 fill-current" />
                        <Star className="size-3.5 fill-current" />
                        <Star className="size-3.5 fill-current" />
                        <Star className="size-3.5 fill-current" />
                        <span className="ml-1 font-bold text-[#202124]">{rating}</span>
                      </div>
                      <span>({reviews})</span>
                      <span>·</span>
                      <span className="font-semibold text-[#188038]">
                        {stock === "InStock" ? "Skladom" : "Dostupné"}
                      </span>
                      <span>·</span>
                      <span className="font-bold text-[#202124]">{price} €</span>
                      <span>·</span>
                      <span>{brand}</span>
                    </div>

                    {/* Snippet Description */}
                    <p className="text-[14px] leading-relaxed text-[#4d5156] break-words">
                      {description}
                    </p>

                    {/* Google FAQ Accordions Mock */}
                    {includeFaq && faqList.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#ebebeb] space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#70757a] block">
                          Ľudia sa tiež pýtajú:
                        </span>
                        {faqList.map((f) => (
                          <div
                            key={f.id}
                            className="p-2.5 rounded-lg bg-[#f8f9fa] border border-[#e8eaed]"
                          >
                            <span className="text-[13px] font-semibold text-[#1a0dab] block">
                              {f.q}
                            </span>
                            <span className="text-[12px] text-[#4d5156] mt-0.5 block leading-normal">
                              {f.a}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Google Ranking Analysis Box */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-text-secondary block font-label-sm">CTR Odhad</span>
                      <span className="font-headline-sm text-base font-bold text-google-green">
                        ~28.4%
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary block font-label-sm">
                        Pozícia v SERP
                      </span>
                      <span className="font-headline-sm text-base font-bold text-primary">
                        TOP 1
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary block font-label-sm">
                        Schema Validácia
                      </span>
                      <span className="font-headline-sm text-base font-bold text-google-green flex items-center justify-center gap-1">
                        <Check className="size-4" /> 100% Pass
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-xs font-mono text-text-secondary">
                      Schema.org (Product + AggregateRating + FAQPage)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyJsonLd}
                      className="h-8 text-xs font-medium text-primary"
                    >
                      <Copy className="size-3.5 mr-1" /> Kopírovať
                    </Button>
                  </div>
                  <pre className="p-4 rounded-xl bg-surface-container-low border border-border-subtle text-xs font-mono text-text-primary overflow-x-auto max-h-[460px] leading-relaxed">
                    <code>{jsonLdCode}</code>
                  </pre>
                </div>
              )}
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
