import { Fragment, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Target,
  CheckCircle2,
  Calendar,
  Mail,
  Building2,
  X,
  ExternalLink,
  Settings,
  Layers,
  Share2,
  Check,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  buildExecutiveReportData,
  formatDomainDisplayName,
  generateShareableReportLink,
  type AgencyProfile,
  type ExecutiveReportData,
  DEFAULT_AGENCY_PROFILE,
} from "@/lib/agency";
import { exportClientReportPdf } from "@/lib/pdf-report";
import type { DecayDataset } from "@/lib/decay-schema";

interface ClientReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteUrl: string;
  dataset?: DecayDataset | null;
  summary?: {
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
}

export function ClientReportModal({
  open,
  onOpenChange,
  siteUrl,
  dataset,
  summary,
}: ClientReportModalProps) {
  const [agency, setAgency] = useState<AgencyProfile>(DEFAULT_AGENCY_PROFILE);
  const [experiments, setExperiments] = useState<
    Array<{
      id: string;
      page_url: string;
      implemented_at: string;
      target_queries?: string[];
      changes?: string;
      status?: string;
      baseline?: { clicks?: number; position?: number };
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  // Load agency profile and experiments
  useEffect(() => {
    if (!open) return;
    let active = true;

    async function loadData() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // 1. Fetch agency profile
          const { data: profile } = await supabase
            .from("agency_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (active && profile) {
            setAgency(profile);
          }

          // 2. Fetch seo_experiments for this site
          const { data: exps } = await supabase
            .from("seo_experiments")
            .select("id, page_url, implemented_at, target_queries, changes, status, baseline")
            .eq("site_url", siteUrl)
            .order("created_at", { ascending: false })
            .limit(10);

          if (active && exps) {
            setExperiments(
              exps.map((e) => ({
                id: e.id,
                page_url: e.page_url,
                implemented_at: e.implemented_at,
                target_queries: e.target_queries,
                changes: e.changes,
                status: e.status,
                baseline: e.baseline as { clicks?: number; position?: number } | undefined,
              })),
            );
          }
        }
      } catch (err) {
        console.error("Error loading agency report data:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, [open, siteUrl]);

  const report: ExecutiveReportData = buildExecutiveReportData({
    dataset,
    siteUrl,
    summary,
    experiments,
    agencyProfile: agency,
  });

  const [copiedLink, setCopiedLink] = useState(false);

  const handlePrint = () => {
    exportClientReportPdf(report, {
      criticalDrops: dataset?.rows,
    });
  };

  const handleCopyShareLink = async () => {
    const link = generateShareableReportLink({
      siteUrl,
      agencyName: report.agency.name,
    });
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success("Odkaz na klientsky report bol skopírovaný do schránky!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("Nepodarilo sa skopírovať odkaz.");
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat("sk-SK").format(Math.round(n));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[92vh] inset-0 sm:inset-auto sm:top-[50%] sm:left-[50%] translate-x-0 translate-y-0 sm:translate-x-[-50%] sm:translate-y-[-50%] rounded-none sm:rounded-xl border-0 sm:border p-0 flex flex-col gap-0 overflow-hidden bg-background [&>button:last-child]:hidden sm:[&>button:last-child]:hidden">
        {/* Modal Toolbar (Hidden during print) */}
        <div className="no-print border-b bg-card shrink-0 px-3 py-2 sm:px-6 sm:py-3.5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] sm:pt-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            {/* Left: Brand Identity & Title & Mobile Close */}
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span
                  className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg text-white font-bold text-xs sm:text-sm shadow-sm"
                  style={{ backgroundColor: report.agency.primaryColor }}
                >
                  {report.agency.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <DialogTitle className="text-sm sm:text-base font-semibold leading-tight truncate">
                    Mesačný SEO Report pre klienta
                  </DialogTitle>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                    <span className="hidden sm:inline">Branding agentúry: </span>
                    <span className="font-medium text-foreground">{report.agency.name}</span>
                    <span className="text-muted-foreground/60 mx-1">·</span>
                    <span className="text-foreground/90 font-medium">{report.client.domain}</span>
                  </p>
                </div>
              </div>

              {/* Close button visible on mobile */}
              <Button
                variant="ghost"
                size="icon"
                className="size-7 sm:hidden rounded-lg hover:bg-muted shrink-0"
                onClick={() => onOpenChange(false)}
                aria-label="Zatvoriť náhľad"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Actions: Full-width responsive row on mobile; right-aligned on desktop */}
            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <Button
                onClick={handleCopyShareLink}
                variant="outline"
                size="sm"
                className="h-8 flex-1 sm:flex-none min-w-0 gap-1.5 text-xs px-2 sm:px-3"
                title="Kopírovať odkaz na report"
              >
                {copiedLink ? (
                  <Check className="size-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <Share2 className="size-3.5 shrink-0" />
                )}
                <span className="truncate">
                  {copiedLink ? (
                    "Skopírované"
                  ) : (
                    <>
                      <span className="inline sm:hidden">Zdieľať</span>
                      <span className="hidden sm:inline">Zdieľať odkaz</span>
                    </>
                  )}
                </span>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 flex-1 sm:flex-none min-w-0 gap-1 text-xs px-2 sm:px-3"
              >
                <Link to="/settings/agency" onClick={() => onOpenChange(false)}>
                  <Settings className="size-3.5 shrink-0" />
                  <span className="truncate">
                    <span className="inline sm:hidden">Branding</span>
                    <span className="hidden sm:inline">Branding agentúry</span>
                  </span>
                </Link>
              </Button>
              <Button
                onClick={handlePrint}
                size="sm"
                className="h-8 flex-1 sm:flex-none min-w-0 gap-1.5 text-xs font-semibold shadow-sm text-white px-2 sm:px-3"
                style={{ backgroundColor: report.agency.primaryColor }}
              >
                <Printer className="size-3.5 shrink-0" />
                <span className="truncate">
                  <span className="inline sm:hidden">PDF</span>
                  <span className="hidden sm:inline">Stiahnuť PDF</span>
                </span>
              </Button>
              {/* Close button on desktop */}
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 hidden sm:inline-flex rounded-lg hover:bg-muted ml-1"
                onClick={() => onOpenChange(false)}
                aria-label="Zatvoriť náhľad"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Printable Report Canvas */}
        <div className="overflow-y-auto flex-1 p-2 sm:p-6 md:p-10 bg-muted/20 overscroll-contain pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          <article
            id="executive-client-report"
            className="mx-auto max-w-4xl rounded-lg sm:rounded-xl border border-border bg-card p-3 sm:p-8 md:p-12 shadow-sm text-foreground print:border-none print:shadow-none print:p-0 print:max-w-none print:bg-white print:text-black"
          >
            {/* ================= PAGE 1: HEADER & EXECUTIVE SUMMARY ================= */}
            <header className="border-b border-border/80 pb-6 sm:pb-8 print:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
                {/* Agency Brand Identity */}
                <div className="flex items-center gap-3 sm:gap-3.5">
                  {report.agency.logoUrl ? (
                    <img
                      src={report.agency.logoUrl}
                      alt={report.agency.name}
                      className="h-10 sm:h-12 max-w-[160px] sm:max-w-[200px] object-contain"
                    />
                  ) : (
                    <div
                      className="flex size-10 sm:size-12 items-center justify-center rounded-xl font-bold text-lg sm:text-xl text-white shadow-sm shrink-0"
                      style={{ backgroundColor: report.agency.primaryColor }}
                    >
                      {report.agency.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="font-bold text-base sm:text-lg leading-tight tracking-tight">
                      {report.agency.name}
                    </h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 print:text-gray-600">
                      <Mail className="size-3 shrink-0" />
                      <span className="truncate max-w-[200px] sm:max-w-none">
                        {report.agency.contactEmail || "info@agentura.sk"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Report Meta & Dates */}
                <div className="text-left sm:text-right">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium text-muted-foreground print:border print:border-gray-200">
                    <Calendar className="size-3 text-primary shrink-0" />
                    <span>90-dňové porovnávacie obdobie</span>
                  </div>
                  <p className="mt-1.5 sm:mt-2 text-xs text-muted-foreground print:text-gray-500">
                    Vygenerované:{" "}
                    <span className="font-medium text-foreground print:text-black">
                      {report.client.generatedAt}
                    </span>
                  </p>
                </div>
              </div>

              {/* Client Title Bar */}
              <div
                className="mt-6 sm:mt-8 rounded-xl p-4 sm:p-6 text-white shadow-sm"
                style={{ backgroundColor: report.agency.primaryColor }}
              >
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="text-[11px] sm:text-xs uppercase tracking-widest opacity-90 font-medium">
                      Mesačný SEO & Performance Report
                    </span>
                    <h1 className="mt-1 text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight break-words [overflow-wrap:anywhere]">
                      {report.client.domain}
                    </h1>
                    <p className="mt-1 text-xs opacity-85">
                      Porovnanie: {report.client.periodNow} voči {report.client.periodPrev}
                    </p>
                  </div>

                  {/* Health Index Badge */}
                  <div className="rounded-lg bg-black/20 backdrop-blur-sm px-3.5 sm:px-4 py-2 sm:py-2.5 text-left sm:text-right border border-white/10 shrink-0">
                    <div className="text-[10px] sm:text-[11px] uppercase tracking-wider opacity-85">
                      SEO Health Index
                    </div>
                    <div className="text-xl sm:text-2xl font-black">
                      {report.executiveSummary.healthIndex}{" "}
                      <span className="text-xs sm:text-sm font-normal opacity-80">/ 100</span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-medium opacity-90">
                      Stav: {report.executiveSummary.healthStatus}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Executive Summary Cards */}
            <section className="py-6 sm:py-8 border-b border-border/80 print:py-6">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <TrendingUp
                  className="size-4 sm:size-5 shrink-0"
                  style={{ color: report.agency.primaryColor }}
                />
                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                  Výkonnostný sumár (Executive Summary)
                </h3>
              </div>

              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground print:text-gray-700 mb-4 sm:mb-6 bg-muted/40 p-3 sm:p-4 rounded-lg border border-border/40 print:bg-gray-50">
                {report.executiveSummary.executiveNote}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                {/* Organické kliknutia */}
                <div className="rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm print:bg-white print:border-gray-200">
                  <div className="text-[11px] sm:text-xs text-muted-foreground print:text-gray-500 font-medium">
                    Organické kliky
                  </div>
                  <div className="mt-1 sm:mt-1.5 text-xl sm:text-2xl font-bold tracking-tight">
                    {fmt(report.executiveSummary.clicksNow)}
                  </div>
                  <div className="mt-1 sm:mt-1.5 flex items-center gap-1 text-[11px] sm:text-xs font-semibold">
                    {report.executiveSummary.clicksDelta >= 0 ? (
                      <span className="flex items-center text-success-foreground">
                        <ArrowUpRight className="size-3 sm:size-3.5" />+
                        {fmt(report.executiveSummary.clicksDelta)} (
                        {report.executiveSummary.clicksDeltaPct.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="flex items-center text-danger-foreground">
                        <ArrowDownRight className="size-3 sm:size-3.5" />
                        {fmt(report.executiveSummary.clicksDelta)} (
                        {report.executiveSummary.clicksDeltaPct.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Impresie */}
                <div className="rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm print:bg-white print:border-gray-200">
                  <div className="text-[11px] sm:text-xs text-muted-foreground print:text-gray-500 font-medium">
                    Zobrazenia (Impresie)
                  </div>
                  <div className="mt-1 sm:mt-1.5 text-xl sm:text-2xl font-bold tracking-tight">
                    {fmt(report.executiveSummary.impressionsNow)}
                  </div>
                  <div className="mt-1 sm:mt-1.5 flex items-center gap-1 text-[11px] sm:text-xs font-semibold">
                    {report.executiveSummary.impressionsDelta >= 0 ? (
                      <span className="flex items-center text-success-foreground">
                        <ArrowUpRight className="size-3 sm:size-3.5" />+
                        {fmt(report.executiveSummary.impressionsDelta)} (
                        {report.executiveSummary.impressionsDeltaPct.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="flex items-center text-danger-foreground">
                        <ArrowDownRight className="size-3 sm:size-3.5" />
                        {fmt(report.executiveSummary.impressionsDelta)} (
                        {report.executiveSummary.impressionsDeltaPct.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Priemerná pozícia */}
                <div className="rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm print:bg-white print:border-gray-200">
                  <div className="text-[11px] sm:text-xs text-muted-foreground print:text-gray-500 font-medium">
                    Priemerná pozícia
                  </div>
                  <div className="mt-1 sm:mt-1.5 text-xl sm:text-2xl font-bold tracking-tight">
                    {report.executiveSummary.avgPositionNow.toFixed(1)}
                  </div>
                  <div className="mt-1 sm:mt-1.5 flex items-center gap-1 text-[11px] sm:text-xs font-semibold">
                    {report.executiveSummary.avgPositionDelta < 0 ? (
                      <span className="flex items-center text-success-foreground">
                        <ArrowUpRight className="size-3 sm:size-3.5" />
                        {Math.abs(report.executiveSummary.avgPositionDelta).toFixed(1)} posun vpred
                      </span>
                    ) : report.executiveSummary.avgPositionDelta > 0 ? (
                      <span className="flex items-center text-danger-foreground">
                        <ArrowDownRight className="size-3 sm:size-3.5" />+
                        {report.executiveSummary.avgPositionDelta.toFixed(1)} pokles
                      </span>
                    ) : (
                      <span className="text-muted-foreground">stabilná pozícia</span>
                    )}
                  </div>
                </div>

                {/* Počet URL */}
                <div className="rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm print:bg-white print:border-gray-200">
                  <div className="text-[11px] sm:text-xs text-muted-foreground print:text-gray-500 font-medium">
                    Analyzované URL
                  </div>
                  <div className="mt-1 sm:mt-1.5 text-xl sm:text-2xl font-bold tracking-tight">
                    {report.executiveSummary.totalPages}
                  </div>
                  <div className="mt-1 sm:mt-1.5 text-[11px] sm:text-xs text-muted-foreground print:text-gray-500">
                    indexovaných v Google
                  </div>
                </div>
              </div>
            </section>

            {/* ================= PAGE 2: TOP WINNERS & STRIKING DISTANCE ================= */}
            <section className="py-6 sm:py-8 border-b border-border/80 print:py-6 break-inside-avoid">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles
                    className="size-4 sm:size-5 shrink-0"
                    style={{ color: report.agency.primaryColor }}
                  />
                  <h3 className="text-base sm:text-lg font-bold tracking-tight">
                    Top víťazi mesiaca (Rastúce výrazy & URL)
                  </h3>
                </div>
                <span className="text-[11px] sm:text-xs text-muted-foreground print:text-gray-500">
                  Najväčší nárast organických kliknutí
                </span>
              </div>

              {report.topWinners.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3">
                  Zatiaľ nie sú zaznamenané výrazné skoky v klikoch.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-1 sm:mx-0 rounded-lg border border-border/80 print:border-gray-200">
                  <table className="w-full min-w-[500px] text-left text-xs sm:text-sm">
                    <thead className="bg-muted/50 text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider print:bg-gray-100 print:text-gray-700">
                      <tr>
                        <th className="py-2.5 px-3">Kľúčový výraz / URL</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">
                          Kliky (Aktuálne)
                        </th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Predtým</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Nárast</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Pozícia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 print:divide-gray-200">
                      {report.topWinners.map((w, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 print:hover:bg-transparent">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-foreground print:text-black">
                              {w.query}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-sm print:text-gray-600">
                              {w.url.replace(/^https?:\/\/[^/]+/i, "")}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                            {fmt(w.clicksNow)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground print:text-gray-500 whitespace-nowrap">
                            {fmt(w.clicksPrev)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-success-foreground whitespace-nowrap">
                            +{fmt(w.clicksDelta)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                            {w.positionNow.toFixed(1)}
                            {w.positionDelta > 0.5 && (
                              <span className="text-[10px] sm:text-[11px] text-success-foreground ml-1">
                                (↑ {w.positionDelta.toFixed(1)})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Striking Distance Opportunities */}
            <section className="py-6 sm:py-8 border-b border-border/80 print:py-6 break-inside-avoid">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
                <div className="flex items-center gap-2">
                  <Target
                    className="size-4 sm:size-5 shrink-0"
                    style={{ color: report.agency.primaryColor }}
                  />
                  <h3 className="text-base sm:text-lg font-bold tracking-tight">
                    Odhalené príležitosti (Striking Distance — pozície 4–15)
                  </h3>
                </div>
                <span className="text-[11px] sm:text-xs text-muted-foreground print:text-gray-500">
                  Vysoké zobrazenia s potenciálom rýchleho skoku
                </span>
              </div>

              {report.opportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3">
                  Žiadne dopyty v Striking Distance nevyžadujú okamžitý zásah.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-1 sm:mx-0 rounded-lg border border-border/80 print:border-gray-200">
                  <table className="w-full min-w-[540px] text-left text-xs sm:text-sm">
                    <thead className="bg-muted/50 text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider print:bg-gray-100 print:text-gray-700">
                      <tr>
                        <th className="py-2.5 px-3">Dopyt & URL</th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap">Pozícia</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Impresie</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Potenciál</th>
                        <th className="py-2.5 px-3">Odporúčaná akcia agentúry</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 print:divide-gray-200">
                      {report.opportunities.map((o, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 print:hover:bg-transparent">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-foreground print:text-black">
                              {o.query}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-xs print:text-gray-600">
                              {o.url.replace(/^https?:\/\/[^/]+/i, "")}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="inline-block rounded bg-primary/10 text-primary px-2 py-0.5 font-bold text-xs print:bg-gray-100 print:text-black">
                              {o.position.toFixed(1)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                            {fmt(o.impressions)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-success-foreground whitespace-nowrap">
                            {o.potentialGrowth}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground print:text-gray-700">
                            {o.recommendedAction}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ================= PAGE 3: OPTIMIZATIONS & NEXT MONTH PLAN ================= */}
            <section className="py-6 sm:py-8 border-b border-border/80 print:py-6 break-inside-avoid">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2
                  className="size-4 sm:size-5 shrink-0"
                  style={{ color: report.agency.primaryColor }}
                />
                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                  Realizované optimalizácie v sledovanom období
                </h3>
              </div>

              <div className="space-y-3">
                {report.realizedOptimizations.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3 rounded-lg border border-border/70 p-3 sm:p-3.5 bg-card/60 text-sm print:bg-white print:border-gray-200"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground print:border print:border-gray-200 shrink-0">
                          {exp.implemented_at}
                        </span>
                        <span className="text-xs font-medium text-foreground truncate max-w-[260px] sm:max-w-none print:text-black">
                          {exp.page_url.replace(/^https?:\/\/[^/]+/i, "")}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 font-medium print:text-black">
                        {exp.changes}
                      </p>
                      {exp.target_queries.length > 0 && (
                        <p className="text-[11px] text-muted-foreground print:text-gray-600">
                          Cielené kľúčové slová: {exp.target_queries.join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success-foreground bg-success-subtle px-2.5 py-1 rounded-full print:bg-gray-100 print:text-green-700 shrink-0 self-start">
                      <CheckCircle2 className="size-3" />
                      {exp.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Strategic Recommendations for Next Month */}
            <section className="py-6 sm:py-8 border-b border-border/80 print:py-6 break-inside-avoid">
              <div className="flex items-center gap-2 mb-4">
                <Layers
                  className="size-4 sm:size-5 shrink-0"
                  style={{ color: report.agency.primaryColor }}
                />
                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                  Strategické odporúčania a akčný plán na ďalší mesiac
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {report.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/70 p-3.5 sm:p-4 bg-muted/20 print:bg-white print:border-gray-200 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-sm text-foreground print:text-black">
                        {rec.title}
                      </h4>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white shrink-0"
                        style={{ backgroundColor: report.agency.primaryColor }}
                      >
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-700">
                      {rec.description}
                    </p>
                    <div className="text-[11px] font-semibold text-primary pt-1 print:text-gray-800">
                      Očakávaný dopad: {rec.impact}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Whitelabel Footer */}
            <footer className="pt-6 sm:pt-8 text-center text-xs text-muted-foreground print:pt-6 print:text-gray-600 break-inside-avoid">
              <p className="font-medium text-foreground print:text-black">
                {report.agency.footerText}
              </p>
              <p className="mt-1">
                Otázky a konzultácie k reportu:{" "}
                <span className="font-semibold text-foreground print:text-black">
                  {report.agency.contactEmail}
                </span>
              </p>
              <p className="mt-2 text-[10px] opacity-75">
                Tento dokument je dôverný a určený výhradne pre klienta {report.client.domain}.
                Všetky práva vyhradené © {new Date().getFullYear()} {report.agency.name}.
              </p>
            </footer>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
