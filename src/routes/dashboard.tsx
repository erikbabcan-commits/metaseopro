import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Gauge,
  Link2,
  Loader2,
  Minus,
  MousePointerClick,
  Percent,
  Plus,
  Radar,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { streamSSE } from "@/lib/stream-sse";
import { startLaserProgress, stopLaserProgress } from "@/lib/laser-loader";
import { handoffToWriter } from "@/lib/refresh-handoff";
import { OpportunityRadar } from "@/components/OpportunityRadar";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { DecayDataset, ScoredDecayRow } from "@/lib/decay-schema";
import { PaywallModal } from "@/components/PaywallModal";
import { useViewerRole } from "@/hooks/use-viewer-role";
import { ClientReportModal } from "@/components/ClientReportModal";
import { BillingInvoiceSection } from "@/components/BillingInvoiceSection";
import { CmsDeployDialog } from "@/components/CmsDeployDialog";
import { setPwaBadge } from "@/lib/pwa-badging";
import { TactileKpiSlider, type KpiSlideItem } from "@/components/TactileKpiSlider";
import { TactileSegmentedBar, type SegmentedTabKey } from "@/components/TactileSegmentedBar";
import { LaserBorderCard } from "@/components/LaserBorderCard";
import {
  BASE_PRICE_EUR_EXCL_VAT,
  PRICE_LINE_LABEL,
  PRICE_SHORT_LABEL,
} from "@/lib/pricing-proposal";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "SEO Dashboard — SEO4WEB" },
      {
        name: "description",
        content:
          "SEO veliace centrum: KPI, história snapshotov a porovnanie zmien URL a kľúčových slov.",
      },
      { property: "og:title", content: "SEO Dashboard — SEO4WEB" },
      {
        property: "og:description",
        content: "Sleduj kliky, impresie a pozície svojej domény a porovnávaj snapshoty v čase.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

type Summary = {
  pages?: number;
  clicksNow?: number;
  clicksPrev?: number;
  impressionsNow?: number;
  impressionsPrev?: number;
  avgPositionNow?: number;
  avgPositionPrev?: number;
  critical?: number;
  declining?: number;
};

type Snapshot = {
  id: string;
  site_url: string;
  type: string;
  created_at: string;
  metrics_summary: Summary;
  raw_data: DecayDataset;
};

const fmt = (n: number) => new Intl.NumberFormat("sk-SK").format(Math.round(n));
const fmtDate = (s: string) =>
  new Date(s).toLocaleString("sk-SK", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function healthIndex(s: Summary): number {
  const pages = s.pages ?? 0;
  if (!pages) return 100;
  const bad = (s.critical ?? 0) * 1 + (s.declining ?? 0) * 0.5;
  return Math.max(0, Math.round(100 - (bad / pages) * 100));
}

function Delta({
  value,
  invert = false,
  suffix = "",
}: {
  value: number;
  invert?: boolean;
  suffix?: string;
}) {
  if (!value)
    return (
      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium bg-zinc-800 border border-zinc-700 text-zinc-400">
        <Minus className="size-3" />0{suffix}
      </span>
    );
  const good = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={
        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold " +
        (good
          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
          : "bg-rose-500/10 border border-rose-500/20 text-rose-400")
      }
    >
      <Icon className="size-3" />
      {value > 0 ? "+" : ""}
      {Number.isInteger(value) ? fmt(value) : value.toFixed(1)}
      {suffix}
    </span>
  );
}

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [busy, setBusy] = useState(true);
  const [site, setSite] = useState("");
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [properties, setProperties] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [propertiesBusy, setPropertiesBusy] = useState(false);
  const [propertiesError, setPropertiesError] = useState("");
  const [propertiesRetry, setPropertiesRetry] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanStage, setScanStage] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { isAdmin } = useViewerRole();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [cmsDeployOpen, setCmsDeployOpen] = useState(false);
  const [deployTargetUrl, setDeployTargetUrl] = useState("");
  const [deployTitle, setDeployTitle] = useState("");
  const [deployCurrentTitle, setDeployCurrentTitle] = useState("");
  const [deployMetaDesc, setDeployMetaDesc] = useState("");
  const [segmentedTab, setSegmentedTab] = useState<SegmentedTabKey>("dashboard");
  const [quickUrl, setQuickUrl] = useState("");

  const handleOpenDeploy = (targetUrl: string, markdown?: string, currentTitle?: string) => {
    setDeployTargetUrl(targetUrl);
    setDeployCurrentTitle(currentTitle || "");

    if (markdown) {
      const titleMatch = markdown.match(/Title(?:\s*\d*)?:\s*([^\n\r]+)/i);
      const metaMatch = markdown.match(
        /(?:Meta(?:\s*Description)?|Popis)(?:\s*\d*)?:\s*([^\n\r]+)/i,
      );
      const clean = (s?: string) => s?.replace(/^[#*_\s"]+|[#*_\s"]+$/g, "").trim();

      setDeployTitle(clean(titleMatch?.[1]) || currentTitle || "");
      setDeployMetaDesc(clean(metaMatch?.[1]) || "");
    } else {
      setDeployTitle(currentTitle || "");
      setDeployMetaDesc("");
    }
    setCmsDeployOpen(true);
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { redirect: "/dashboard" } });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("seo_snapshots")
        .select("id, site_url, type, created_at, metrics_summary, raw_data")
        .order("created_at", { ascending: false })
        .limit(200);
      const list = (data ?? []) as unknown as Snapshot[];
      setSnaps(list);
      if (list[0]) setSite(list[0].site_url);
      setBusy(false);
    })();
  }, [user]);

  useEffect(() => {
    if (snaps.length > 0) {
      setPwaBadge(snaps.length);
    }
  }, [snaps]);

  const sites = useMemo(() => Array.from(new Set(snaps.map((s) => s.site_url))), [snaps]);
  const siteSnaps = useMemo(() => snaps.filter((s) => s.site_url === site), [snaps, site]);

  useEffect(() => {
    setBId(siteSnaps[0]?.id ?? "");
    setAId(siteSnaps[1]?.id ?? siteSnaps[0]?.id ?? "");
  }, [siteSnaps]);

  const showPropertyPicker = scanOpen || (!busy && snaps.length === 0);
  useEffect(() => {
    if (!user || !showPropertyPicker) return;
    let cancelled = false;
    setPropertiesBusy(true);
    setPropertiesError("");
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Prihlás sa znova a skús to ešte raz.");
        const response = await fetch("/api/decay-gsc-properties", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const result = await response.json();
        if (!response.ok || result.status === "error")
          throw new Error(result.error || "Weby sa nepodarilo načítať.");
        if (result.status === "not_connected")
          throw new Error("Google Search Console nie je pripojený.");
        const list: string[] = (result.properties ?? []).map((p: { siteUrl: string }) => p.siteUrl);
        if (cancelled) return;
        setProperties(list);
        setSelectedProperty((current) => (list.includes(current) ? current : (list[0] ?? "")));
        if (!list.length) setPropertiesError("Pripojený Google účet nemá žiadne overené weby.");
      } catch (error) {
        if (!cancelled) {
          setProperties([]);
          setSelectedProperty("");
          setPropertiesError(
            error instanceof Error ? error.message : "Weby sa nepodarilo načítať.",
          );
        }
      } finally {
        if (!cancelled) setPropertiesBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, showPropertyPicker, propertiesRetry]);

  const runScan = async () => {
    if (scanning || propertiesBusy || !properties.includes(selectedProperty)) return;
    setScanning(true);
    setScanError("");
    setScanStage("Analyzujem dáta zo Search Console…");
    startLaserProgress();
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Prihlás sa znova a skús to ešte raz.");
      const response = await fetch("/api/decay-analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: "live", scenario: "local", siteUrl: selectedProperty }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Analýza sa nepodarila. Skús to znova.");
      if (!result.snapshotId)
        throw new Error("Analýza prebehla, ale výsledok sa neuložil. Skús sken znova.");
      setScanStage("Načítavam uložené výsledky…");
      const { data, error } = await supabase
        .from("seo_snapshots")
        .select("id, site_url, type, created_at, metrics_summary, raw_data")
        .eq("id", result.snapshotId)
        .single();
      if (error || !data)
        throw new Error("Výsledok je uložený, ale nepodarilo sa ho načítať. Obnov Dashboard.");
      const saved = data as unknown as Snapshot;
      setSnaps((current) => [saved, ...current.filter((s) => s.id !== saved.id)]);
      setSite(saved.site_url);
      setScanOpen(false);
      toast.success("Sken je uložený. Dashboard bol aktualizovaný.");
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Analýza sa nepodarila.");
    } finally {
      stopLaserProgress();
      setScanning(false);
    }
  };

  const propertyPicker = (
    <div className="space-y-4">
      {propertiesBusy ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none" />
          Načítavam overené weby…
        </p>
      ) : propertiesError ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-rose-500">
            {propertiesError}
          </p>
          <Button
            variant="outline"
            onClick={() => setPropertiesRetry((n) => n + 1)}
            className="border-border bg-surface-pure text-foreground hover:bg-muted"
          >
            <RefreshCw className="size-3.5 text-primary" />
            Skúsiť znova
          </Button>
        </div>
      ) : (
        <label className="block space-y-2 text-left text-sm">
          <span className="font-medium text-foreground">Overený web v Search Console</span>
          <select
            aria-label="Overený web v Search Console"
            value={selectedProperty}
            disabled={scanning}
            onChange={(e) => {
              setSelectedProperty(e.target.value);
              setScanError("");
            }}
            className="w-full min-w-0 rounded-lg border border-border bg-surface-pure px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {properties.map((url) => (
              <option key={url} value={url} className="bg-surface-pure text-foreground">
                {url}
              </option>
            ))}
          </select>
        </label>
      )}
      {scanError && (
        <p role="alert" className="text-left text-sm text-rose-500">
          {scanError}
        </p>
      )}
      <Button
        disabled={scanning || propertiesBusy || !selectedProperty || !!propertiesError}
        onClick={runScan}
        className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-all"
      >
        {scanning ? (
          <Loader2 className="animate-spin motion-reduce:animate-none" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        {scanning ? "Prebieha sken…" : "Spustiť sken"}
      </Button>
      {scanning && (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {scanStage}
        </p>
      )}
    </div>
  );

  const latest = siteSnaps[0];
  const m = latest?.metrics_summary ?? {};
  const a = siteSnaps.find((s) => s.id === aId);
  const b = siteSnaps.find((s) => s.id === bId);

  const remove = async (id: string) => {
    if (!user) return;
    if (!confirm("Zmazať snapshot?")) return;
    const { error } = await supabase
      .from("seo_snapshots")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (!error) setSnaps((p) => p.filter((s) => s.id !== id));
  };

  const kpiSlides: KpiSlideItem[] = useMemo(() => {
    if (!latest) return [];
    const metrics = latest.metrics_summary;
    const clicksDiff = (metrics.clicksNow ?? 0) - (metrics.clicksPrev ?? 0);
    const impDiff = (metrics.impressionsNow ?? 0) - (metrics.impressionsPrev ?? 0);
    const posDiff = Number(
      ((metrics.avgPositionNow ?? 0) - (metrics.avgPositionPrev ?? 0)).toFixed(1),
    );

    return [
      {
        id: "clicks",
        title: "Kliknutia (90 dní)",
        value: fmt(metrics.clicksNow ?? 0),
        badge: {
          text: `${clicksDiff >= 0 ? "+" : ""}${fmt(clicksDiff)} klikov`,
          isPositive: clicksDiff >= 0,
        },
        subtitle: `${fmt(metrics.clicksPrev ?? 0)} predtým`,
        reportHref: "#radar",
      },
      {
        id: "impressions",
        title: "Google Impresie (SERP)",
        value: fmt(metrics.impressionsNow ?? 0),
        badge: {
          text: `${impDiff >= 0 ? "+" : ""}${fmt(impDiff)} zobrazení`,
          isPositive: impDiff >= 0,
        },
        subtitle: `${fmt(metrics.impressionsPrev ?? 0)} v min. období`,
        reportHref: "#radar",
      },
      {
        id: "health",
        title: "SEO Health Index",
        value: `${healthIndex(metrics)}/100`,
        badge: {
          text: `${metrics.critical ?? 0} kritických zraniteľností`,
          isPositive: (metrics.critical ?? 0) === 0,
        },
        subtitle: `Priem. pozícia: ${(metrics.avgPositionNow ?? 0).toFixed(1)} (${posDiff > 0 ? "pokles o " : "zlepšenie o "}${Math.abs(posDiff)})`,
        reportHref: "#radar",
      },
    ];
  }, [latest]);

  const avgCtr =
    m.impressionsNow && m.impressionsNow > 0 ? ((m.clicksNow ?? 0) / m.impressionsNow) * 100 : 0;
  const ctrPrev =
    m.impressionsPrev && m.impressionsPrev > 0
      ? ((m.clicksPrev ?? 0) / m.impressionsPrev) * 100
      : 0;
  const ctrDelta = Number((avgCtr - ctrPrev).toFixed(1));
  const healthVal = healthIndex(m);
  const opportunityCount = latest?.raw_data?.rows?.length ?? 0;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-surface text-text-primary font-sans antialiased selection:bg-primary/20 selection:text-primary">
      <AppHeader />
      <Toaster />
      <main className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-5">
        {/* 1. HLAVIČKA DASHBOARDU & STATUS (Search Clarity 100dvh) */}
        <section className="flex flex-col gap-3.5">
          {/* Live Badge & Last Sync Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-google-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-google-green" />
              </span>
              <span className="text-[11px] leading-[14px] tracking-[0.02em] text-secondary font-medium">
                Live monitoring
              </span>
            </div>
            <div className="flex items-center gap-1 text-text-secondary text-[11px] leading-[14px]">
              <RefreshCw className="size-3.5 text-google-green" />
              <span>{latest ? fmtDate(latest.created_at) : "Pripravené"}</span>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[28px] leading-[36px] md:text-4xl font-medium tracking-[-0.015em] text-text-primary">
              AI SEO Command Center
            </h1>
            <p className="text-[13px] leading-[18px] text-text-secondary">
              Živý audit &amp; rastový radar{" "}
              {site ? `pre ${site.replace("sc-domain:", "")}` : "pre tvoj web"}
            </p>
          </div>

          {/* Quick Status Bar (Google Search Console State) */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-surface-pure flex items-center justify-center shadow-xs shrink-0">
                <CheckCircle2 className="size-4 text-google-green" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] leading-[16px] font-semibold text-text-primary truncate">
                  {sites.length > 0 ? "GSC prepojené" : "GSC pripravené"}
                </span>
                <span className="text-[11px] leading-[14px] text-text-secondary">
                  {sites.length > 0 ? "Dáta overené" : "Vyber doménu pre sken"}
                </span>
              </div>
            </div>
            {sites.length > 0 ? (
              <select
                aria-label="Vybraný web"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="min-w-0 max-w-[165px] sm:max-w-[260px] truncate rounded-full bg-surface-pure px-3 py-1.5 text-[12px] font-medium text-text-primary shadow-xs border border-border-subtle focus:border-primary focus:outline-none"
              >
                {sites.map((s) => (
                  <option key={s} value={s} className="bg-surface-pure text-text-primary">
                    {s.replace("sc-domain:", "")}
                  </option>
                ))}
              </select>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-surface-pure text-[11px] font-medium text-text-secondary shadow-xs">
                0 domén
              </span>
            )}
          </div>

          {/* Dual Primary Action Buttons (+ Desktop Quick Actions) */}
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
            <Button
              type="button"
              onClick={() => navigate({ to: "/raketa" })}
              className="h-11 px-4 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition-all hover:bg-primary text-[12px] font-medium"
            >
              <Rocket className="size-4" />
              <span className="whitespace-nowrap">Spustiť Raketu</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || scanning}
              onClick={() => {
                if (sites.length >= 1 && !isAdmin) {
                  setPaywallOpen(true);
                  return;
                }
                setScanError("");
                setScanOpen(true);
              }}
              className="h-11 px-4 rounded-full bg-surface-pure text-on-secondary-container border border-border-subtle flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition-all hover:bg-surface-container-low text-[12px] font-medium"
            >
              <Radar className="size-4 text-google-green" />
              <span className="whitespace-nowrap">Skenovať doménu</span>
            </Button>
            {latest && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setReportModalOpen(true)}
                className="col-span-2 sm:col-span-1 h-10 px-4 rounded-full border border-border-default bg-surface-pure text-text-primary hover:bg-surface-container-low transition-all shadow-xs text-[12px] font-medium gap-1.5"
              >
                <FileText className="size-4 text-primary" />
                Klientsky report (PDF)
              </Button>
            )}
            {!isAdmin && (
              <Button
                type="button"
                onClick={() => setPaywallOpen(true)}
                className="col-span-2 sm:col-span-1 h-10 px-4 rounded-full bg-primary-fixed text-on-primary-fixed font-semibold hover:bg-primary-fixed-dim/50 transition-all shadow-xs text-[12px] gap-1.5"
              >
                <Sparkles className="size-4 text-primary" />
                Aktivovať Pro ({PRICE_SHORT_LABEL})
              </Button>
            )}
          </div>
        </section>

        {/* 2. TACTILE SEGMENTED BAR */}
        <TactileSegmentedBar
          activeTab={segmentedTab}
          onTabChange={setSegmentedTab}
          counts={{
            dashboard: siteSnaps.length,
            status: latest?.metrics_summary.critical ?? 0,
            projects: sites.length,
          }}
        />

        <Dialog
          open={scanOpen}
          onOpenChange={(open) => {
            if (!scanning) setScanOpen(open);
          }}
        >
          <DialogContent
            className="max-w-[calc(100%-2rem)] sm:max-w-lg border border-border bg-surface-pure text-foreground shadow-2xl"
            aria-describedby={undefined}
            onEscapeKeyDown={(e) => {
              if (scanning) e.preventDefault();
            }}
            onPointerDownOutside={(e) => {
              if (scanning) e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-foreground font-display text-lg">
                Analyzovať ďalší web
              </DialogTitle>
            </DialogHeader>
            {scanOpen && propertyPicker}
          </DialogContent>
        </Dialog>

        {busy ? (
          <div className="mt-8 space-y-4">
            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl bg-surface-pure border border-border shadow-xs p-5 space-y-2"
                >
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-7 w-28 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : !latest ? (
          <section className="mx-auto mt-10 max-w-lg space-y-5 rounded-xl border border-border bg-surface-pure p-8 shadow-sm">
            <p className="text-foreground/80 font-medium">Zatiaľ nemáš žiadne uložené snapshoty.</p>
            {!scanOpen && propertyPicker}
          </section>
        ) : (
          <>
            {(segmentedTab === "dashboard" || segmentedTab === "status") && (
              <>
                {/* 3. TACTILE KPI CARDS (2x2 Grid on Mobile, 4-col on Desktop) */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5">
                  {/* Karta 1: SEO Zdravie */}
                  <div className="p-3.5 rounded-xl bg-surface-pure border border-border-subtle shadow-[0_1px_3px_rgba(60,64,67,0.08)] flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] text-text-secondary font-medium">
                        SEO Zdravie
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          healthVal >= 80
                            ? "bg-secondary-fixed/60 text-on-secondary-fixed"
                            : healthVal >= 50
                              ? "bg-tertiary-fixed/70 text-on-tertiary-fixed"
                              : "bg-error-container text-on-error-container"
                        }`}
                      >
                        {healthVal >= 80 ? "Skvelé" : healthVal >= 50 ? "Pozor" : "Kritické"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 my-2">
                      <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                        <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-surface-container"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                          <path
                            className={
                              healthVal >= 80
                                ? "text-google-green"
                                : healthVal >= 50
                                  ? "text-google-yellow"
                                  : "text-google-red"
                            }
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeDasharray={`${healthVal}, 100`}
                            strokeLinecap="round"
                            strokeWidth="3.2"
                          />
                        </svg>
                        <span className="absolute text-[15px] font-bold text-text-primary">
                          {healthVal}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] text-text-secondary">z 100 b.</span>
                        <span className="text-[11px] font-semibold text-google-green">
                          {m.declining ?? 0} klesá
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 pt-1 text-[11px] text-text-secondary truncate">
                      <span className="inline-block size-2 rounded-full bg-google-red shrink-0" />
                      <span>{m.critical ?? 0} kritických chýb</span>
                    </div>
                  </div>

                  {/* Karta 2: Kliknutia GSC */}
                  <div className="p-3.5 rounded-xl bg-surface-pure border border-border-subtle shadow-[0_1px_3px_rgba(60,64,67,0.08)] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-text-secondary font-medium">
                        Kliknutia GSC
                      </span>
                      <MousePointerClick className="size-4 text-primary" />
                    </div>
                    <div className="my-1.5">
                      <div className="text-[22px] leading-[28px] font-bold text-text-primary tabular-nums">
                        {fmt(m.clicksNow ?? 0)}
                      </div>
                      <div className="mt-0.5">
                        <Delta value={(m.clicksNow ?? 0) - (m.clicksPrev ?? 0)} />
                      </div>
                    </div>
                    <div className="w-full h-5 mt-1">
                      <svg
                        className="w-full h-full text-google-blue-bright"
                        fill="none"
                        viewBox="0 0 100 24"
                      >
                        <path
                          d="M0 20 L20 18 L40 14 L60 16 L80 8 L100 2"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    <div className="text-[11px] text-text-secondary mt-1">
                      Priem. pozícia:{" "}
                      <span className="font-semibold text-text-primary">
                        {(m.avgPositionNow ?? 0).toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Karta 3: Priem. CTR */}
                  <div className="p-3.5 rounded-xl bg-surface-pure border border-border-subtle shadow-[0_1px_3px_rgba(60,64,67,0.08)] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-text-secondary font-medium">
                        Priem. CTR
                      </span>
                      <Percent className="size-4 text-tertiary-fixed-dim" />
                    </div>
                    <div className="my-1.5">
                      <div className="text-[22px] leading-[28px] font-bold text-text-primary tabular-nums">
                        {avgCtr.toFixed(1)} %
                      </div>
                      <div className="mt-0.5">
                        <Delta value={ctrDelta} suffix="%" />
                      </div>
                    </div>
                    <div className="w-full h-5 mt-1">
                      <svg
                        className="w-full h-full text-google-yellow"
                        fill="none"
                        viewBox="0 0 100 24"
                      >
                        <path
                          d="M0 16 L25 18 L50 11 L75 12 L100 4"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    <div className="text-[11px] text-text-secondary mt-1 truncate">
                      {fmt(m.impressionsNow ?? 0)} zobrazení celkom
                    </div>
                  </div>

                  {/* Karta 4: Príležitosti */}
                  <div className="p-3.5 rounded-xl bg-surface-pure border border-border-subtle shadow-[0_1px_3px_rgba(60,64,67,0.08)] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-text-secondary font-medium">
                        Príležitosti
                      </span>
                      <TrendingUp className="size-4 text-google-green" />
                    </div>
                    <div className="my-1.5">
                      <div className="text-[22px] leading-[28px] font-bold text-text-primary tabular-nums">
                        {opportunityCount} tém
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-google-green font-semibold mt-0.5">
                        <span>+{fmt(Math.round((m.impressionsNow ?? 0) * 0.03))} potenciál</span>
                      </div>
                    </div>
                    <a
                      href="#radar-list"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      <span>Spustiť analýzu</span>
                      <ArrowRight className="size-3.5" />
                    </a>
                  </div>
                </section>
                <p className="mt-3 text-xs text-muted-foreground">
                  Posledný snapshot:{" "}
                  <span className="font-semibold text-foreground">
                    {fmtDate(latest.created_at)}
                  </span>
                </p>
                <dl
                  aria-label="Porovnávané obdobia GSC"
                  className="mt-3 flex flex-wrap gap-x-8 gap-y-2 rounded-xl bg-muted/40 border border-border px-5 py-3 text-sm shadow-xs"
                >
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Aktuálne obdobie (90 dní)
                    </dt>
                    <dd className="font-semibold text-foreground mt-0.5">
                      {latest.raw_data?.periodNow || "Dátumy nie sú dostupné"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Predchádzajúce obdobie (90 dní)
                    </dt>
                    <dd className="font-semibold text-foreground mt-0.5">
                      {latest.raw_data?.periodPrev || "Dátumy nie sú dostupné"}
                    </dd>
                  </div>
                </dl>

                {user && (
                  <OpportunityRadar snap={latest} userId={user.id} onDeploy={handleOpenDeploy} />
                )}
                <Explorer snap={latest} />
                <CtrBooster snap={latest} onDeploy={handleOpenDeploy} />
              </>
            )}

            {(segmentedTab === "dashboard" || segmentedTab === "projects") && (
              <>
                {/* Snapshots */}
                <section className="mt-12">
                  <h2 className="text-lg font-bold text-foreground font-display">
                    Uložené snapshoty
                  </h2>
                  <ul className="mt-3 divide-y divide-border rounded-xl bg-surface-pure border border-border shadow-xs overflow-hidden">
                    {siteSnaps.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm hover:bg-muted/40 transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{fmtDate(s.created_at)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {s.type} · {s.metrics_summary.pages ?? 0} URL
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="font-medium text-foreground">
                            {fmt(s.metrics_summary.clicksNow ?? 0)} klikov
                          </span>
                          <span className="text-muted-foreground">
                            poz. {(s.metrics_summary.avgPositionNow ?? 0).toFixed(1)}
                          </span>
                          <span className="rounded bg-muted px-2 py-0.5 text-foreground border border-border font-medium">
                            health {healthIndex(s.metrics_summary)}/100
                          </span>
                          <Button
                            variant="studio"
                            size="studio"
                            onClick={() => remove(s.id)}
                            aria-label="Zmazať"
                            className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md p-1.5 transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Diff */}
                <section className="mt-12">
                  <h2 className="text-lg font-bold text-foreground font-display">
                    Porovnávač snapshotov
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <SnapSelect
                      label="Starší (A)"
                      value={aId}
                      onChange={setAId}
                      snaps={siteSnaps}
                    />
                    <span className="text-muted-foreground">→</span>
                    <SnapSelect label="Novší (B)" value={bId} onChange={setBId} snaps={siteSnaps} />
                  </div>
                  {siteSnaps.length < 2 && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Na porovnanie potrebuješ aspoň 2 snapshoty. Spusti ďalšiu live analýzu neskôr.
                    </p>
                  )}
                  {a && b && a.id !== b.id && <DiffView a={a} b={b} />}
                </section>
              </>
            )}
          </>
        )}

        {/* 5. RÝCHLY AI ASISTENT & SKEN (Rýchla URL inšpekcia) */}
        {(segmentedTab === "dashboard" || segmentedTab === "status") && (
          <section className="p-4 rounded-xl bg-surface-pure border border-border-subtle shadow-[0_1px_3px_rgba(60,64,67,0.08)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-fixed/60 flex items-center justify-center text-primary">
                  <Search className="size-4" />
                </div>
                <h2 className="text-[16px] leading-[22px] font-semibold text-text-primary">
                  Rýchla URL inšpekcia
                </h2>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-google-green font-medium">
                <Gauge className="size-3.5" />
                <span>CWV Live</span>
              </div>
            </div>
            <p className="text-[13px] leading-[18px] text-text-secondary">
              Okamžitá AI kontrola meta značiek, indexácie a Core Web Vitals metrík.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const target = quickUrl.trim() || site.replace("sc-domain:", "");
                navigate({
                  to: "/audit",
                  search: target ? { url: target } : undefined,
                });
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex items-center flex-1">
                <Link2 className="size-4 absolute left-3.5 text-text-secondary pointer-events-none" />
                <input
                  type="text"
                  value={quickUrl}
                  onChange={(e) => setQuickUrl(e.target.value)}
                  placeholder="napr. mojeshop.sk/novy-produkt"
                  aria-label="URL podstránky na inšpekciu"
                  className="w-full h-11 pl-10 pr-3 rounded-full bg-surface-container-low text-[13px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface-pure border border-transparent focus:border-primary shadow-xs"
                />
              </div>
              <Button
                type="submit"
                className="h-11 px-5 rounded-full bg-primary-container text-on-primary-container text-[12px] font-semibold flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all hover:bg-primary"
              >
                <Search className="size-4" />
                <span>Analyzovať podstránku</span>
              </Button>
            </form>
          </section>
        )}

        {/* 6. FAKTURÁCIA & PREDPLATNÉ */}
        {(segmentedTab === "dashboard" || segmentedTab === "projects") && (
          <section className="p-4 sm:p-6 rounded-xl bg-surface-pure border border-border-subtle shadow-[0_1px_3px_rgba(60,64,67,0.08)] flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold">
                  Aktívne predplatné &amp; Fakturácia
                </span>
                <h2 className="text-[18px] leading-[24px] font-bold text-text-primary mt-0.5">
                  {isAdmin ? "Superadmin Neobmedzený" : "Správa plánu a domén"}
                </h2>
              </div>
              {!isAdmin && (
                <div className="text-right shrink-0">
                  <span className="text-[18px] font-bold text-primary">
                    {BASE_PRICE_EUR_EXCL_VAT} €
                  </span>
                  <span className="text-[11px] text-text-secondary"> / mesiac bez DPH</span>
                </div>
              )}
            </div>

            {/* Domain Limit Progress Bar */}
            <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-surface-container-low">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-secondary">Využitie doménových slotov</span>
                <span className="font-bold text-text-primary">
                  {sites.length} {isAdmin ? "domén (neobmedzene)" : "z 5 domén"}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                <div
                  className="h-full bg-google-green rounded-full transition-all"
                  style={{
                    width: `${isAdmin ? 100 : Math.min(100, Math.max(8, (sites.length / 5) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <BillingInvoiceSection />
          </section>
        )}
      </main>

      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        title="Odomknite neobmedzený počet webov s balíkom Pro"
        description={`Bezplatný plán umožňuje sledovanie 1 webu. S balíkom Pro (${PRICE_LINE_LABEL}) získate sledovanie až 5 webov, neobmedzený Decay Radar a WordPress exporty.`}
      />

      <ClientReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        siteUrl={site || latest?.site_url || ""}
        dataset={latest?.raw_data}
        summary={m}
      />

      <CmsDeployDialog
        open={cmsDeployOpen}
        onOpenChange={setCmsDeployOpen}
        siteUrl={site || latest?.site_url || ""}
        targetUrl={deployTargetUrl}
        initialTitle={deployTitle}
        currentTitle={deployCurrentTitle}
        initialMetaDescription={deployMetaDesc}
      />
    </div>
  );
}

function Kpi({ label, value, delta }: { label: string; value: string; delta: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-pure p-5 border border-border shadow-xs hover:border-primary/40 hover:shadow-sm transition-all duration-200">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">{value}</p>
      <div className="mt-2.5 flex items-center text-xs">{delta}</div>
    </div>
  );
}

function SnapSelect({
  label,
  value,
  onChange,
  snaps,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  snaps: Snapshot[];
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-surface-pure px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
      >
        {snaps.map((s) => (
          <option key={s.id} value={s.id} className="bg-surface-pure text-foreground">
            {fmtDate(s.created_at)}
          </option>
        ))}
      </select>
    </label>
  );
}

type Line = {
  key: string;
  aClicks: number;
  bClicks: number;
  aPos: number | null;
  bPos: number | null;
};

function DiffView({ a, b }: { a: Snapshot; b: Snapshot }) {
  const { urls, queries } = useMemo(() => {
    const rowsA = a.raw_data?.rows ?? [];
    const rowsB = b.raw_data?.rows ?? [];
    const build = (
      getA: () => Map<string, [number, number]>,
      getB: () => Map<string, [number, number]>,
    ) => {
      const ma = getA(),
        mb = getB();
      const keys = new Set([...ma.keys(), ...mb.keys()]);
      return [...keys]
        .map<Line>((k) => ({
          key: k,
          aClicks: ma.get(k)?.[0] ?? 0,
          bClicks: mb.get(k)?.[0] ?? 0,
          aPos: ma.get(k)?.[1] ?? null,
          bPos: mb.get(k)?.[1] ?? null,
        }))
        .sort((x, y) => Math.abs(y.bClicks - y.aClicks) - Math.abs(x.bClicks - x.aClicks));
    };
    const urlMap = (rows: ScoredDecayRow[]) => {
      const m = new Map<string, [number, number]>();
      rows.forEach((r) => {
        const u = r.url?.trim();
        if (!u) return;
        const cur = m.get(u);
        if (!cur) {
          m.set(u, [r.clicksNow, r.positionNow]);
        } else {
          m.set(u, [(cur[0] ?? 0) + r.clicksNow, Math.min(cur[1], r.positionNow)]);
        }
      });
      return m;
    };
    const qMap = (rows: ScoredDecayRow[]) => {
      const m = new Map<string, [number, number]>();
      rows.forEach((r) =>
        r.topQueries?.forEach((q) => {
          const query = q.query?.trim();
          if (!query) return;
          const cur = m.get(query);
          m.set(query, [
            (cur?.[0] ?? 0) + q.clicksNow,
            cur ? Math.min(cur[1], q.positionNow) : q.positionNow,
          ]);
        }),
      );
      return m;
    };
    return {
      urls: build(
        () => urlMap(rowsA),
        () => urlMap(rowsB),
      ),
      queries: build(
        () => qMap(rowsA),
        () => qMap(rowsB),
      ),
    };
  }, [a, b]);

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <DiffTable title="URL" lines={urls} />
      <DiffTable title="Kľúčové slová" lines={queries} />
    </div>
  );
}

function DiffTable({ title, lines }: { title: string; lines: Line[] }) {
  return (
    <div className="overflow-hidden rounded-xl bg-surface-pure border border-border shadow-xs">
      <div className="border-b border-border bg-muted/40 px-4 py-3 text-sm font-semibold text-foreground font-display">
        {title}
      </div>
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/70 text-muted-foreground border-b border-border text-[11px] uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-3.5 py-2.5 text-left">{title}</th>
              <th className="px-2 text-right">Kliky A→B</th>
              <th className="px-2 text-right">Δ</th>
              <th className="px-3.5 text-right">Pozícia</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3.5 py-6 text-center text-muted-foreground">
                  Žiadne dáta.
                </td>
              </tr>
            )}
            {lines.map((l, idx) => {
              const d = l.bClicks - l.aClicks;
              const pd =
                l.aPos != null && l.bPos != null ? Number((l.bPos - l.aPos).toFixed(1)) : 0;
              const bg = d > 0 ? "bg-emerald-500/[0.04]" : d < 0 ? "bg-rose-500/[0.04]" : "";
              return (
                <tr
                  key={`${title}-${l.key || "row"}-${idx}`}
                  className={"border-t border-border/60 hover:bg-muted/40 transition-colors " + bg}
                >
                  <td
                    className="max-w-[220px] truncate px-3.5 py-2.5 font-medium text-foreground"
                    title={l.key}
                  >
                    {l.key.replace(/^https?:\/\/[^/]+/, "") || "/"}
                  </td>
                  <td className="px-2 text-right text-foreground/80 tabular-nums">
                    {fmt(l.aClicks)} → {fmt(l.bClicks)}
                  </td>
                  <td className="px-2 text-right">
                    <Delta value={d} />
                  </td>
                  <td className="px-3.5 text-right text-foreground/80 tabular-nums">
                    {l.bPos != null ? l.bPos.toFixed(1) : "—"}{" "}
                    {pd !== 0 && <Delta invert value={pd} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const path = (u: string) => u.replace(/^https?:\/\/[^/]+/, "") || "/";
const ctrOf = (c: number, i: number) => (i > 0 ? (c / i) * 100 : 0);

type SortKey = "decay" | "clicks" | "impressions" | "position" | "ctr";

function Explorer({ snap }: { snap: Snapshot }) {
  const rows = useMemo(() => {
    const raw = snap.raw_data?.rows ?? [];
    const seen = new Set<string>();
    const unique: ScoredDecayRow[] = [];
    for (const r of raw) {
      const u = r.url?.trim().toLowerCase();
      if (!u || seen.has(u)) continue;
      seen.add(u);
      unique.push(r);
    }
    return unique;
  }, [snap.raw_data?.rows]);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("decay");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const f = rows.filter(
      (r) =>
        !needle ||
        r.url.toLowerCase().includes(needle) ||
        r.topQueries.some((x) => x.query.toLowerCase().includes(needle)),
    );
    const key: Record<SortKey, (r: ScoredDecayRow) => number> = {
      decay: (r) => -r.decayScore,
      clicks: (r) => -r.clicksNow,
      impressions: (r) => -r.impressionsNow,
      position: (r) => r.positionNow,
      ctr: (r) => ctrOf(r.clicksNow, r.impressionsNow),
    };
    return [...f].sort((a, b) => key[sort](a) - key[sort](b));
  }, [rows, q, sort]);

  const refresh = (r: ScoredDecayRow) => {
    handoffToWriter(snap.site_url, r);
    window.location.href = "/?fromRefresh=1";
  };

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground font-display">
            Všetky URL a kľúčové slová
          </h2>
          <p className="text-xs text-muted-foreground">
            {rows.length} URL z posledného snapshotu · klikni na riadok pre dopyty
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Hľadať URL alebo dopyt…"
            className="rounded-lg border border-border bg-surface-pure px-3.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-border bg-surface-pure px-3 py-1.5 text-xs text-foreground focus:border-primary"
          >
            <option value="decay" className="bg-surface-pure text-foreground">
              Najväčší prepad
            </option>
            <option value="clicks" className="bg-surface-pure text-foreground">
              Kliky
            </option>
            <option value="impressions" className="bg-surface-pure text-foreground">
              Impresie
            </option>
            <option value="position" className="bg-surface-pure text-foreground">
              Najlepšia pozícia
            </option>
            <option value="ctr" className="bg-surface-pure text-foreground">
              Najnižší CTR
            </option>
          </select>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl bg-surface-pure border border-border shadow-xs">
        <table className="w-full min-w-[760px] text-xs">
          <thead className="bg-muted/50 text-muted-foreground border-b border-border text-[11px] uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-3.5 py-2.5 text-left">URL / dopyt</th>
              <th className="px-2 text-right">Kliky</th>
              <th className="px-2 text-right">Impresie</th>
              <th className="px-2 text-right">CTR</th>
              <th className="px-2 text-right">Pozícia</th>
              <th className="px-2 text-right">Decay</th>
              <th className="px-3.5" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3.5 py-6 text-center text-muted-foreground">
                  Nič sa nenašlo.
                </td>
              </tr>
            )}
            {list.map((r, rIdx) => {
              const isOpen = !!open[r.url];
              return (
                <Fragment key={`${r.url}-${rIdx}`}>
                  <tr
                    className="cursor-pointer border-t border-border/60 hover:bg-muted/40 transition-colors"
                    onClick={() => setOpen((o) => ({ ...o, [r.url]: !isOpen }))}
                  >
                    <td className="max-w-[280px] px-3.5 py-2.5">
                      <span
                        className="flex items-center gap-1.5 truncate font-medium text-foreground"
                        title={r.url}
                      >
                        {isOpen ? (
                          <ChevronDown className="size-3.5 shrink-0 text-primary" />
                        ) : (
                          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        {path(r.url)}
                      </span>
                    </td>
                    <td className="px-2 text-right text-foreground font-medium tabular-nums">
                      {fmt(r.clicksNow)} <Delta value={r.clicksNow - r.clicksPrev} />
                    </td>
                    <td className="px-2 text-right text-muted-foreground tabular-nums">
                      {fmt(r.impressionsNow)}
                    </td>
                    <td className="px-2 text-right text-muted-foreground tabular-nums">
                      {ctrOf(r.clicksNow, r.impressionsNow).toFixed(1)} %
                    </td>
                    <td className="px-2 text-right text-muted-foreground tabular-nums">
                      {r.positionNow.toFixed(1)}{" "}
                      <Delta invert value={Number((r.positionNow - r.positionPrev).toFixed(1))} />
                    </td>
                    <td className="px-2 text-right font-mono text-foreground font-semibold">
                      {r.decayScore}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <Button
                        variant="studio"
                        size="studio"
                        onClick={(e) => {
                          e.stopPropagation();
                          refresh(r);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary hover:bg-primary/90 px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-colors shadow-xs"
                      >
                        <FileText className="size-3" /> Aktualizovať článok
                      </Button>
                    </td>
                  </tr>
                  {isOpen &&
                    r.topQueries.map((x, xIdx) => (
                      <tr
                        key={`${r.url}-${x.query || "empty"}-${xIdx}`}
                        className="bg-muted/30 text-muted-foreground border-t border-border/40"
                      >
                        <td className="py-2 pl-10 pr-3 font-mono text-[11px] text-foreground">
                          „{x.query}“
                        </td>
                        <td className="px-2 text-right tabular-nums text-foreground">
                          {fmt(x.clicksNow)} <Delta value={x.clicksNow - x.clicksPrev} />
                        </td>
                        <td className="px-2 text-right text-muted-foreground">—</td>
                        <td className="px-2 text-right text-muted-foreground">—</td>
                        <td className="px-2 text-right tabular-nums text-foreground">
                          {x.positionNow.toFixed(1)}{" "}
                          <Delta
                            invert
                            value={Number((x.positionNow - x.positionPrev).toFixed(1))}
                          />
                        </td>
                        <td colSpan={2} />
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Expected organic CTR by position (rough industry curve, %).
const expectedCtr = (pos: number) =>
  pos <= 1 ? 28 : pos <= 2 ? 15 : pos <= 3 ? 11 : pos <= 5 ? 7 : pos <= 10 ? 3 : 1.2;

function CtrBooster({
  snap,
  onDeploy,
}: {
  snap: Snapshot;
  onDeploy?: (url: string, markdown?: string, currentTitle?: string) => void;
}) {
  const candidates = useMemo(() => {
    const raw = snap.raw_data?.rows ?? [];
    const seen = new Set<string>();
    const unique: ScoredDecayRow[] = [];
    for (const r of raw) {
      const u = r.url?.trim().toLowerCase();
      if (!u || seen.has(u)) continue;
      seen.add(u);
      unique.push(r);
    }

    return unique
      .filter((r) => r.impressionsNow >= 100 && r.positionNow <= 15)
      .map((r) => ({
        r,
        ctr: ctrOf(r.clicksNow, r.impressionsNow),
        exp: expectedCtr(r.positionNow),
      }))
      .filter((x) => x.ctr < x.exp)
      .sort((a, b) => b.r.impressionsNow * (b.exp - b.ctr) - a.r.impressionsNow * (a.exp - a.ctr))
      .slice(0, 8);
  }, [snap]);
  const [active, setActive] = useState<string | null>(null);
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (r: ScoredDecayRow, ctr: number) => {
    setActive(r.url);
    setOut("");
    setBusy(true);
    let buf = "";
    await streamSSE({
      url: "/api/ctr-boost",
      body: {
        url: r.url,
        title: r.title,
        queries: r.topQueries.map((q) => q.query).slice(0, 10),
        position: r.positionNow,
        ctr,
        impressions: r.impressionsNow,
      },
      onDelta: (c) => {
        buf += c;
        setOut(buf);
      },
      onDone: () => setBusy(false),
      onError: (m) => {
        setBusy(false);
        toast.error(m);
      },
    });
  };

  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground font-display">
        <Sparkles className="size-4 text-amber-500" /> CTR Booster
      </h2>
      <p className="text-xs text-muted-foreground">
        Stránky, ktoré Google často zobrazuje, ale ľudia na ne klikajú menej, než je pri ich pozícii
        bežné.
      </p>
      {candidates.length === 0 ? (
        <p className="mt-3 rounded-xl bg-surface-pure border border-border p-5 text-sm text-muted-foreground shadow-xs">
          Žiadne stránky s podpriemerným CTR. Výborné!
        </p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <ul className="divide-y divide-border rounded-xl bg-surface-pure border border-border shadow-xs overflow-hidden">
            {candidates.map(({ r, ctr, exp }, idx) => (
              <li
                key={`${r.url}-${idx}`}
                className={
                  "flex items-center justify-between gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-muted/40 " +
                  (active === r.url ? "bg-muted/60 border-l-2 border-primary" : "")
                }
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground" title={r.url}>
                    {path(r.url)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    poz.{" "}
                    <span className="text-foreground font-medium">{r.positionNow.toFixed(1)}</span>{" "}
                    · {fmt(r.impressionsNow)} impr. · CTR{" "}
                    <span className="text-rose-500 font-semibold">{ctr.toFixed(1)} %</span> (bežne ~
                    {exp} %)
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="studio"
                    size="studio"
                    disabled={busy}
                    onClick={() => run(r, ctr)}
                    className="rounded-md bg-primary hover:bg-primary/90 px-2.5 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50 transition-colors shadow-xs"
                  >
                    Navrhnúť title + popis
                  </Button>
                  {onDeploy && (
                    <Button
                      variant="studio"
                      size="studio"
                      onClick={() => onDeploy(r.url, "", r.title)}
                      className="rounded-md border border-border bg-surface-pure hover:bg-muted p-1.5 text-primary transition-colors shadow-xs"
                      title="🚀 Nasadiť do WordPressu"
                    >
                      <Rocket className="size-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {/* Terminal Box for AI Output wrapped with Laser Border Beam */}
          <LaserBorderCard className="min-h-[220px]">
            {!active ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
                <Sparkles className="size-8 mb-2 text-zinc-500" />
                <p className="text-sm">
                  Vyber stránku vľavo a AI navrhne 3 varianty title a meta popisu.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex gap-1.5">
                      <span className="size-2.5 rounded-full bg-rose-500/80" />
                      <span className="size-2.5 rounded-full bg-amber-500/80" />
                      <span className="size-2.5 rounded-full bg-emerald-500/80" />
                    </span>
                    <span className="font-mono text-emerald-400 truncate max-w-[200px] sm:max-w-[280px]">
                      {path(active)}
                    </span>
                  </div>
                  {out && !busy && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="studio"
                        size="studio"
                        onClick={() => {
                          navigator.clipboard.writeText(out);
                          toast.success("Skopírované");
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:text-white hover:bg-zinc-700 transition-colors"
                      >
                        <Copy className="size-3" /> Kopírovať
                      </Button>
                      {onDeploy && (
                        <Button
                          variant="studio"
                          size="studio"
                          onClick={() => onDeploy(active, out)}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors"
                        >
                          <Rocket className="size-3" /> 🚀 Nasadiť na web
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {busy && !out && (
                  <div className="flex items-center gap-2 py-8 text-sm text-zinc-400">
                    <Loader2 className="size-4 animate-spin text-emerald-400" />
                    Generujem optimalizované návrhy…
                  </div>
                )}
                <div className="prose prose-invert prose-sm max-w-none font-mono text-xs text-zinc-200 leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{out}</ReactMarkdown>
                </div>
              </>
            )}
          </LaserBorderCard>
        </div>
      )}
    </section>
  );
}
