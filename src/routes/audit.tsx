import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  ArrowDown,
  ArrowRight,
  Copy,
  Globe,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { streamSSE } from "@/lib/stream-sse";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/use-auth";
import { auditLoginRedirect, parseDomainInput } from "@/lib/domain-input";
import { saveOutput } from "@/lib/outputs.functions";
import { PaywallModal } from "@/components/PaywallModal";
import { useViewerRole } from "@/hooks/use-viewer-role";
import { PageSpeedCard } from "@/components/PageSpeedCard";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "SEO Audit — SEO4WEB" },
      {
        name: "description",
        content:
          "Zadaj 1 až 5 domén. SEO4WEB SEO Audit stiahne a porovná ich úvodné stránky (title, meta, nadpisy, obsah) a navrhne konkrétne on-page kroky.",
      },
      { property: "og:title", content: "SEO Audit — SEO4WEB" },
      {
        property: "og:description",
        content:
          "Zadaj 1 až 5 domén. SEO4WEB SEO Audit stiahne a porovná ich úvodné stránky (title, meta, nadpisy, obsah) a navrhne konkrétne on-page kroky.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const save = useServerFn(saveOutput);
  const [input, setInput] = useState("");
  const [domains, setDomains] = useState<string[]>([]);
  const [database, setDatabase] = useState<string>("");
  const [yourDomain, setYourDomain] = useState<string>("");
  const [report, setReport] = useState("");
  const [status, setStatus] = useState<"idle" | "streaming" | "done">("idle");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { isAdmin, plan } = useViewerRole();
  const hasPaid = isAdmin || (plan !== null && plan !== "free");
  const maxAllowedDomains = hasPaid ? 5 : 3;
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URL(window.location.href).searchParams.get("domain");
    if (!raw) return;
    const normalized = parseDomainInput(raw);
    if (!normalized) return;
    setDomains((current) =>
      current.includes(normalized) ? current : [...current, normalized].slice(0, 5),
    );
  }, []);

  useEffect(() => {
    if (loading || user) return;
    const redirect = auditLoginRedirect(
      typeof window !== "undefined"
        ? new URL(window.location.href).searchParams.get("domain")
        : null,
    );
    navigate({ to: "/login", search: { redirect } });
  }, [user, loading, navigate]);

  const parseDomains = (raw: string): string[] => {
    return Array.from(
      new Set(
        raw
          .split(/[\s,;\n]+/)
          .map((s) => s.trim().toLowerCase())
          .map((s) => s.replace(/^https?:\/\//, "").replace(/^www\./, ""))
          .map((s) => s.split("/")[0])
          .filter(Boolean),
      ),
    );
  };

  const addFromInput = () => {
    const parsed = parseDomains(input);
    if (parsed.length === 0) return;
    if (domains.length + parsed.length > 3 && !hasPaid) {
      setPaywallOpen(true);
    }
    const merged = Array.from(new Set([...domains, ...parsed])).slice(0, maxAllowedDomains);
    setDomains(merged);
    setInput("");
  };

  const removeDomain = (d: string) => {
    setDomains((cur) => cur.filter((x) => x !== d));
  };

  const start = async () => {
    const all = Array.from(new Set([...domains, ...parseDomains(input)])).slice(
      0,
      maxAllowedDomains,
    );
    if (all.length === 0) {
      toast.error("Zadaj aspoň jednu doménu.");
      return;
    }
    if (all.length > 3 && !hasPaid) {
      setPaywallOpen(true);
      return;
    }
    setDomains(all);
    setInput("");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setReport("");
    setStatus("streaming");

    let buffer = "";
    let raf = 0;
    const flush = () => {
      raf = 0;
      setReport(buffer);
    };

    await streamSSE({
      url: "/api/audit-domains",
      body: { domains: all, database, yourDomain: yourDomain.trim() },
      signal: controller.signal,
      onDelta: (chunk) => {
        buffer += chunk;
        if (!raf) raf = requestAnimationFrame(flush);
      },
      onDone: async () => {
        if (raf) cancelAnimationFrame(raf);
        setReport(buffer);
        setStatus("done");
        try {
          await save({
            data: {
              type: "audit",
              title: `Audit: ${all.join(", ")}`.slice(0, 200),
              input: { domains: all },
              output_markdown: buffer,
            },
          });
        } catch (e) {
          console.error(e);
        }
      },
      onError: (msg) => {
        if (raf) cancelAnimationFrame(raf);
        toast.error(msg);
        setStatus(buffer ? "done" : "idle");
        if (buffer) setReport(buffer);
      },
    });
  };

  const stop = () => {
    abortRef.current?.abort();
    setStatus(report ? "done" : "idle");
  };

  const copy = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    toast.success("Skopírované do schránky");
  };

  const download = () => {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo4web-seo-audit-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showOutput = status !== "idle" || report.length > 0;
  const canRun = (domains.length > 0 || parseDomains(input).length > 0) && status !== "streaming";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed-variant">
      <Toaster />
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-28 md:pb-16 space-y-6">
        {/* Top Search & Domain Input Bar */}
        <section className="bg-surface-pure rounded-2xl p-4 sm:p-5 shadow-xs border border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container shrink-0">
              <Globe className="size-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-semibold">
                Analyzované domény ({domains.length}/{maxAllowedDomains})
              </span>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {domains.length === 0 ? (
                  <span className="font-body-sm text-body-sm text-text-secondary italic">
                    Zadajte aspoň 1 webovú adresu
                  </span>
                ) : (
                  domains.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container font-label-md text-label-md text-text-primary font-medium border border-border-subtle"
                    >
                      {d}
                      <button
                        type="button"
                        onClick={() => removeDomain(d)}
                        className="text-text-secondary hover:text-google-red transition-colors"
                        aria-label={`Odstrániť ${d}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <div className="relative flex-1 sm:w-80">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (input.trim()) addFromInput();
                    else if (canRun) start();
                  }
                }}
                placeholder="napr. mojweb.sk, konkurent.sk"
                className="w-full h-11 pl-4 pr-10 rounded-full bg-surface-container-low border border-border-subtle text-text-primary font-body-sm text-body-sm placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container transition-all"
              />
              {input.trim() && (
                <button
                  type="button"
                  onClick={addFromInput}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-primary hover:bg-primary/10 transition-colors"
                  title="Pridať doménu"
                >
                  <Plus className="size-4" />
                </button>
              )}
            </div>

            {status === "streaming" ? (
              <Button
                variant="destructive"
                onClick={stop}
                className="rounded-full px-5 h-11 font-label-lg text-label-lg font-bold flex items-center gap-2 shadow-xs"
              >
                <Square className="size-4" /> Zastaviť
              </Button>
            ) : (
              <Button
                variant="studio"
                onClick={start}
                disabled={!canRun}
                className="rounded-full px-6 h-11 font-label-lg text-label-lg font-bold bg-primary-container hover:bg-primary text-white flex items-center gap-2 shadow-xs active:scale-[0.98] transition-all"
              >
                <Sparkles className="size-4" />
                <span>{showOutput ? "Nový audit" : "Spustiť audit"}</span>
              </Button>
            )}
          </div>
        </section>

        {/* Options Row (Your Domain & Database selection) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-surface-pure rounded-xl p-3.5 border border-border-subtle shadow-xs flex items-center gap-3">
            <span className="font-label-md text-label-md text-text-secondary font-medium shrink-0">
              Váš hlavný web:
            </span>
            <input
              type="text"
              value={yourDomain}
              onChange={(e) => setYourDomain(e.target.value)}
              placeholder="voliteľné (označí váš web vo výsledkoch)"
              className="w-full bg-transparent border-0 text-text-primary font-body-sm text-body-sm focus:outline-none placeholder:text-text-secondary/60"
            />
          </div>

          <div className="bg-surface-pure rounded-xl p-3.5 border border-border-subtle shadow-xs flex items-center gap-3">
            <span className="font-label-md text-label-md text-text-secondary font-medium shrink-0">
              Cieľový trh:
            </span>
            <select
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              className="w-full bg-transparent border-0 text-text-primary font-body-sm text-body-sm focus:outline-none cursor-pointer"
            >
              <option value="">Slovensko (sk)</option>
              <option value="cz">Česko (cz)</option>
              <option value="us">USA (us)</option>
              <option value="de">Nemecko (de)</option>
              <option value="uk">Veľká Británia (uk)</option>
            </select>
          </div>
        </section>

        {/* Audit Results Dashboard (Search Clarity 2-Column Grid) */}
        {showOutput && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* AI Action CTA Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary via-primary-container to-[#174EA6] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                  <Sparkles className="size-5 text-white" />
                </div>
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed block font-bold">
                    Odporúčaná akcia
                  </span>
                  <p className="font-body-sm text-sm text-white font-medium">
                    Premeňte tieto zistenia na optimalizovaný obsah jediným klikom.
                  </p>
                </div>
              </div>
              <Link
                to="/raketa"
                className="shrink-0 px-5 py-2.5 rounded-full bg-white text-primary font-label-md text-label-md font-bold hover:bg-surface-container transition-all active:scale-[0.98] shadow-xs flex items-center gap-1.5"
              >
                <span>Spustiť SEO Raketu</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>

            {/* Detailed Markdown Report Container */}
            <div className="bg-surface-pure rounded-2xl p-6 sm:p-8 shadow-xs border border-border-subtle">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-lg font-bold text-text-primary">
                    Detailný analytický report
                  </span>
                  {status === "streaming" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/10 text-primary-container font-label-sm text-label-sm font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                      Analyzujem dáta...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copy}
                    disabled={!report}
                    className="rounded-full h-8 text-xs font-medium"
                  >
                    <Copy className="size-3.5 mr-1" /> Kopírovať
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={download}
                    disabled={!report}
                    className="rounded-full h-8 text-xs font-medium"
                  >
                    <ArrowDown className="size-3.5 mr-1" /> .md
                  </Button>
                </div>
              </div>

              {report ? (
                <article className="prose prose-neutral max-w-none prose-headings:font-sans prose-h1:text-2xl prose-h2:text-xl prose-h2:font-bold prose-h2:mt-6 prose-p:text-text-secondary prose-p:leading-relaxed prose-strong:text-text-primary prose-table:text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                  {status === "streaming" && (
                    <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-primary-container align-middle" />
                  )}
                </article>
              ) : (
                <div className="space-y-4 py-8">
                  <div className="h-4 w-1/4 animate-pulse rounded bg-surface-container" />
                  <div className="h-4 w-full animate-pulse rounded bg-surface-container" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-surface-container" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-surface-container" />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-8">
          <PageSpeedCard domain={yourDomain || domains[0]} />
        </div>
      </main>

      {/* Floating Bottom Sticky Action Dock (Search Clarity Mobile & Desktop) */}
      {status === "done" && report && (
        <div
          className="fixed left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-pure/95 backdrop-blur-md px-4 py-2.5 rounded-full border border-border-subtle shadow-md z-40"
          style={{
            bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={start}
            className="rounded-full px-3.5 h-9 font-label-md text-label-md text-text-primary hover:bg-surface-container flex items-center gap-1.5"
          >
            <RotateCcw className="size-4" />
            <span>Znovu spustiť</span>
          </Button>

          <div className="w-px h-5 bg-border-subtle" />

          <Button
            variant="ghost"
            size="sm"
            onClick={copy}
            className="rounded-full px-3.5 h-9 font-label-md text-label-md text-text-primary hover:bg-surface-container flex items-center gap-1.5"
          >
            <Copy className="size-4" />
            <span>Kopírovať</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={download}
            className="rounded-full px-3.5 h-9 font-label-md text-label-md text-text-primary hover:bg-surface-container flex items-center gap-1.5"
          >
            <ArrowDown className="size-4" />
            <span>Stiahnuť .md</span>
          </Button>

          {!isAdmin && (
            <Button
              variant="studio"
              size="sm"
              onClick={() => setPaywallOpen(true)}
              className="rounded-full px-4 h-9 font-label-md text-label-md font-bold bg-primary-container text-white hover:bg-primary flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="size-4" />
              <span>Kúpiť Pro</span>
            </Button>
          )}
        </div>
      )}

      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        title="Odomknite neobmedzený SEO Audit s balíkom Pro"
        description="Bezplatný plán umožňuje analyzovať maximálne 3 domény. S balíkom Pro získate audit až 5 domén naraz, WordPress export a neobmedzené sledovanie konkurencie."
      />
    </div>
  );
}
