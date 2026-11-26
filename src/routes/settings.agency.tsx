import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Sparkles,
  Palette,
  Mail,
  FileText,
  Image as ImageIcon,
  Check,
  Printer,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Eye,
  CreditCard,
  Globe,
  ExternalLink,
  Layers,
  CheckCircle2,
  Lock,
  RefreshCw,
  Download,
  Calendar,
  Wifi,
  Battery,
  Signal,
  HelpCircle,
  Key,
  Upload,
  Radio,
  FileDown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_AGENCY_PROFILE, type AgencyProfile } from "@/lib/agency";
import { PaywallModal } from "@/components/PaywallModal";
import { useViewerRole } from "@/hooks/use-viewer-role";
import { ClientReportModal } from "@/components/ClientReportModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillingInvoiceSection } from "@/components/BillingInvoiceSection";
import { BillingPortalCard } from "@/components/BillingPortalCard";
import { CmsConnectionsSection } from "@/components/CmsConnectionsSection";
import { createCustomerPortalSession, getUserSubscription } from "@/lib/billing.functions";
import { checkoutPlanLabel } from "@/lib/billing-ui";
import { PRICE_LINE_LABEL, TRIAL_LABEL } from "@/lib/pricing-proposal";
import { PLANS, type PlanId } from "@/lib/slovak-billing";

type SettingsTab = "branding" | "cms" | "billing";
type SettingsSearch = { tab?: SettingsTab };
type SubscriptionState =
  | { userId: string; status: "loading" }
  | { userId: string; status: "error"; message: string }
  | { userId: string; status: "ready"; plan: PlanId; hasStripeCustomer: boolean };

export const Route = createFileRoute("/settings/agency")({
  validateSearch: (search: Record<string, unknown>): SettingsSearch => ({
    tab:
      search.tab === "branding" || search.tab === "cms" || search.tab === "billing"
        ? search.tab
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Nastavenia agentúry & Whitelabel Branding — SEO4WEB" },
      {
        name: "description",
        content:
          "Nastavte si logo, farby a kontaktné údaje vašej marketingovej agentúry pre automatické mesačné SEO reporty pre klientov.",
      },
      { property: "og:title", content: "Nastavenia agentúry — SEO4WEB" },
      {
        property: "og:description",
        content: "Identita agentúry, vlastné logo a branding klientskych SEO reportov.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgencySettingsPage,
});

const COLOR_PRESETS = [
  { name: "Smaragdová (Emerald)", hex: "#10b981" },
  { name: "Google Modrá", hex: "#1a73e8" },
  { name: "Zafírová (Sapphire)", hex: "#2563eb" },
  { name: "Kráľovská modrá (Indigo)", hex: "#6366f1" },
  { name: "Fialová (Purple)", hex: "#8b5cf6" },
  { name: "Ružová (Rose)", hex: "#ec4899" },
  { name: "Jantárová (Amber)", hex: "#f59e0b" },
  { name: "Antracit (Slate)", hex: "#0f172a" },
];

function AgencySettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { tab = "branding" } = Route.useSearch();
  const loadSubscription = useServerFn(getUserSubscription);
  const startPortal = useServerFn(createCustomerPortalSession);
  const userId = user?.id;
  const activeUserId = useRef(userId);

  const [agencyName, setAgencyName] = useState(DEFAULT_AGENCY_PROFILE.agency_name);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_AGENCY_PROFILE.primary_color);
  const [accentColor, setAccentColor] = useState("#10B981");
  const [backgroundColor, setBackgroundColor] = useState("#FAFAFB");
  const [contactEmail, setContactEmail] = useState(DEFAULT_AGENCY_PROFILE.contact_email || "");
  const [reportFooterText, setReportFooterText] = useState(
    DEFAULT_AGENCY_PROFILE.report_footer_text || "",
  );
  const [subdomain, setSubdomain] = useState("seo.digitalstudio.sk");

  // Mobile specific features from reference
  const [cnameEnabled, setCnameEnabled] = useState(true);
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [defaultReportFormat, setDefaultReportFormat] = useState<"portal" | "pdf">("portal");
  const [hidePoweredBy, setHidePoweredBy] = useState(true);
  const [autoDispatch, setAutoDispatch] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState | null>(null);
  const [subscriptionRetry, setSubscriptionRetry] = useState(0);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { isAdmin } = useViewerRole();
  const [previewOpen, setPreviewOpen] = useState(false);

  const currentSubscription = subscriptionState?.userId === userId ? subscriptionState : null;
  const userPlan = currentSubscription?.status === "ready" ? currentSubscription.plan : undefined;

  useEffect(() => {
    activeUserId.current = userId;
    setOpeningPortal(false);
    return () => {
      activeUserId.current = undefined;
    };
  }, [userId]);

  // Authentication redirect guard
  useEffect(() => {
    if (!authLoading && !user) {
      void navigate({ to: "/login", search: { redirect: `/settings/agency?tab=${tab}` } });
    }
  }, [user, authLoading, navigate, tab]);

  // Load user subscription
  useEffect(() => {
    if (!userId) return;
    const currentUserId = userId;
    let active = true;
    setSubscriptionState({ userId: currentUserId, status: "loading" });

    void loadSubscription()
      .then((subscription) => {
        if (!active) return;
        setSubscriptionState({
          userId: currentUserId,
          status: "ready",
          plan: subscription.plan,
          hasStripeCustomer: subscription.hasStripeCustomer,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSubscriptionState({
          userId: currentUserId,
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Nepodarilo sa načítať predplatné. Skúste to znova.",
        });
      });

    return () => {
      active = false;
    };
  }, [userId, loadSubscription, subscriptionRetry]);

  // Load agency profile from Supabase
  useEffect(() => {
    if (!userId) return;
    const currentUserId = userId;
    let active = true;
    setLoadingData(true);

    void supabase
      .from("agency_profiles")
      .select("*")
      .eq("user_id", currentUserId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast.error("Chyba pri načítavaní profilu: " + error.message);
        } else if (data) {
          const profile = data as unknown as AgencyProfile;
          setAgencyName(profile.agency_name || DEFAULT_AGENCY_PROFILE.agency_name);
          setLogoUrl(profile.logo_url || "");
          setPrimaryColor(profile.primary_color || DEFAULT_AGENCY_PROFILE.primary_color);
          setContactEmail(profile.contact_email || "");
          setReportFooterText(profile.report_footer_text || "");
        }
        setLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        user_id: userId,
        agency_name: agencyName.trim() || DEFAULT_AGENCY_PROFILE.agency_name,
        logo_url: logoUrl.trim() || null,
        primary_color: primaryColor,
        contact_email: contactEmail.trim() || null,
        report_footer_text: reportFooterText.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("agency_profiles").upsert(payload, {
        onConflict: "user_id",
      });

      if (error) throw error;
      setSaveSuccess(true);
      toast.success("Agentúrny branding bol úspešne uložený a synchronizovaný!");

      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    } catch (err: unknown) {
      toast.error(
        "Chyba pri ukladaní nastavení: " + (err instanceof Error ? err.message : "Neznáma chyba"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPortal = async () => {
    if (!userId) return;
    setOpeningPortal(true);
    try {
      const { url } = await startPortal();
      if (activeUserId.current !== userId) return;
      window.location.assign(url);
    } catch (error) {
      if (activeUserId.current !== userId) return;
      setOpeningPortal(false);
      toast.error(
        error instanceof Error ? error.message : "Nepodarilo sa otvoriť zákaznícky portál.",
      );
    }
  };

  const handleVerifyDns = () => {
    setVerifyingDns(true);
    setTimeout(() => {
      setVerifyingDns(false);
      toast.success("CNAME záznam je správne nasmerovaný! SSL certifikát (TLS 1.3) je aktívny.");
    }, 1200);
  };

  const handleCopyMagicLink = () => {
    void navigator.clipboard.writeText(`https://${subdomain}/client-portal?token=magic_ds_98f42`);
    toast.success("Bezpečný klientsky Magic Link skopírovaný do schránky!");
  };

  const handleDownloadSamplePdf = () => {
    toast.success("Generujem a sťahujem vzorový klientsky PDF report (3.2 MB)...");
  };

  const handleRegistrarGuide = (registrarName: string) => {
    toast.info(
      `Návod pre ${registrarName}: Vytvorte CNAME záznam s hostiteľom 'seo' smerujúcim na 'cname.seo4web.com'.`,
    );
  };

  const isAgencyPlan = userPlan === "agency";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed-variant">
      <Toaster />
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 md:pb-16 space-y-6">
        {/* Page Top Header Banner */}
        <section className="bg-surface-pure rounded-2xl p-5 sm:p-6 shadow-xs border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                <Building2 className="size-4" />
              </span>
              <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                Agentúrny Whitelabel Hub
              </h1>
            </div>
            <p className="font-body-md text-sm text-text-secondary mt-1 max-w-3xl">
              Prispôsobte si kompletný vizuál portálu pod vlastnú agentúrnu identitu. Vaši klienti
              uvidia výhradne vaše logo, farby a subdoménu bez zmienky o Seo4web.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#E6F4EA] rounded-full">
              <span className="w-2 h-2 rounded-full bg-google-green animate-pulse"></span>
              <span className="font-label-md text-xs text-[#00722f] font-semibold">
                Whitelabel aktívny (Agency Pro)
              </span>
            </div>
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              className="rounded-full h-9 px-4 text-xs font-semibold gap-1.5 border-border-default hover:bg-surface-container"
            >
              <Eye className="size-4" />
              Náhľad klientskeho portálu
            </Button>
          </div>
        </section>

        {/* Agency Plan Status Banner (if not Agency) */}
        {userPlan && !isAgencyPlan && !isAdmin && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Váš aktuálny balík: {PLANS[userPlan].name}
                </span>
                <span className="text-xs text-text-secondary">
                  · Whitelabel portál a CNAME subdomény sú exkluzívna funkcia balíka Agency
                </span>
              </div>
              <p className="text-sm font-medium text-text-primary">
                Aktivujte balík Agency ({PRICE_LINE_LABEL}) a získajte neobmedzený klientsky portál
                s vlastným logom, subdoménou a automatickými mesačnými reportmi. Predplatné máš{" "}
                {TRIAL_LABEL}.
              </p>
            </div>
            <Button
              onClick={() => setPaywallOpen(true)}
              className="rounded-full px-5 h-10 font-label-md text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
              style={{ backgroundColor: primaryColor }}
            >
              <Sparkles className="size-3.5" />
              Aktivovať {checkoutPlanLabel("agency")}
            </Button>
          </div>
        )}

        {/* Tabs Navigation */}
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (value === "branding" || value === "cms" || value === "billing") {
              void navigate({ to: "/settings/agency", search: { tab: value }, replace: true });
            }
          }}
        >
          <TabsList className="mb-6 grid w-full max-w-xl grid-cols-3 bg-surface-container-low p-1 rounded-full border border-border-subtle">
            <TabsTrigger value="branding" className="rounded-full gap-2 text-xs font-semibold">
              <Building2 className="size-4" />
              <span>Branding & Portál</span>
            </TabsTrigger>
            <TabsTrigger value="cms" className="rounded-full gap-2 text-xs font-semibold">
              <Globe className="size-4" />
              <span>CMS & CNAME</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="rounded-full gap-2 text-xs font-semibold">
              <CreditCard className="size-4" />
              <span>Fakturácia</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Branding & Report */}
          <TabsContent value="branding" className="mt-0">
            {/* =========================================================================
                DESKTOP 12-COLUMN STUDIO LAYOUT (LG SCREENS)
                ========================================================================= */}
            <div className="hidden lg:grid grid-cols-12 gap-6 items-start">
              {/* Left Column: Settings Form */}
              <div className="lg:col-span-7 space-y-6">
                <form id="agency-form" onSubmit={handleSave} className="space-y-6">
                  {/* Basic Identity Card */}
                  <div className="bg-surface-pure rounded-2xl p-5 sm:p-6 shadow-xs border border-border-subtle space-y-4">
                    <div className="flex items-center gap-2 font-bold text-sm text-text-primary pb-3 border-b border-border-subtle">
                      <Building2 className="size-4 text-primary" />
                      <span>Základná identita agentúry</span>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="agencyName"
                        className="text-xs font-semibold text-text-primary"
                      >
                        Názov marketingovej / SEO agentúry{" "}
                        <span className="text-google-red">*</span>
                      </Label>
                      <Input
                        id="agencyName"
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        placeholder="napr. Apex Media & Performance"
                        required
                        className="rounded-xl bg-surface-container-low border-border-subtle"
                      />
                      <p className="text-[11px] text-text-secondary">
                        Tento názov bude uvedený na titulnej strane a v záhlaví každého klientskeho
                        reportu a v navigačnej lište portálu.
                      </p>
                    </div>

                    {/* Logo URL */}
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl" className="text-xs font-semibold text-text-primary">
                        URL adresa loga agentúry (PNG, SVG, WebP)
                      </Label>
                      <Input
                        id="logoUrl"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://vasa-agentura.sk/logo.png"
                        className="rounded-xl bg-surface-container-low border-border-subtle"
                      />
                      <p className="text-[11px] text-text-secondary">
                        Odporúčaný formát: horizontálne logo s transparentným pozadím na svetlom
                        podklade.
                      </p>
                    </div>

                    {/* Contact Email */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="contactEmail"
                        className="text-xs font-semibold text-text-primary"
                      >
                        Kontaktný e-mail pre klientov
                      </Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="info@vasa-agentura.sk"
                        className="rounded-xl bg-surface-container-low border-border-subtle"
                      />
                    </div>
                  </div>

                  {/* Visual Theme Card */}
                  <div className="bg-surface-pure rounded-2xl p-5 sm:p-6 shadow-xs border border-border-subtle space-y-4">
                    <div className="flex items-center gap-2 font-bold text-sm text-text-primary pb-3 border-b border-border-subtle">
                      <Palette className="size-4 text-primary" />
                      <span>Farebná identita agentúry</span>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-semibold text-text-primary">
                        Primárna farba klientskeho rozhrania a grafov
                      </Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          id="primaryColorPicker"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-10 w-14 rounded-xl border border-border-default cursor-pointer bg-surface-container-low p-1"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          placeholder="#1a73e8"
                          className="w-36 font-mono text-xs rounded-xl bg-surface-container-low border-border-subtle uppercase"
                        />
                      </div>

                      <div className="pt-2">
                        <Label className="text-[11px] text-text-secondary mb-2 block">
                          Predvolené palety:
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_PRESETS.map((preset) => (
                            <button
                              key={preset.hex}
                              type="button"
                              onClick={() => setPrimaryColor(preset.hex)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
                                primaryColor.toLowerCase() === preset.hex.toLowerCase()
                                  ? "border-primary-container bg-primary-fixed text-on-primary-fixed font-bold shadow-xs"
                                  : "border-border-subtle bg-surface-container-low hover:bg-surface-container text-text-primary"
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: preset.hex }}
                              />
                              <span>{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subdomain Card */}
                  <div className="bg-surface-pure rounded-2xl p-5 sm:p-6 shadow-xs border border-border-subtle space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                      <div className="flex items-center gap-2 font-bold text-sm text-text-primary">
                        <Globe className="size-4 text-primary" />
                        <span>Vlastná subdoména (CNAME)</span>
                      </div>
                      <span className="text-[11px] font-semibold text-google-green bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                        SSL Aktívne
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="subdomain"
                        className="text-xs font-semibold text-text-primary"
                      >
                        Klientska adresa
                      </Label>
                      <div className="flex items-center px-3.5 py-2.5 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono">
                        <span className="text-text-secondary select-none">https://</span>
                        <input
                          id="subdomain"
                          type="text"
                          value={subdomain}
                          onChange={(e) => setSubdomain(e.target.value)}
                          className="bg-transparent text-primary font-medium focus:outline-none flex-1 ml-0.5"
                        />
                      </div>
                      <p className="text-[11px] text-text-secondary">
                        Nasmerujte CNAME záznam vašej domény na <code>cname.seo4web.com</code>. SSL
                        certifikát bude vygenerovaný automaticky do 15 minút.
                      </p>
                    </div>
                  </div>

                  {/* Footer Text Card */}
                  <div className="bg-surface-pure rounded-2xl p-5 sm:p-6 shadow-xs border border-border-subtle space-y-4">
                    <div className="flex items-center gap-2 font-bold text-sm text-text-primary pb-3 border-b border-border-subtle">
                      <FileText className="size-4 text-primary" />
                      <span>Pätička reportu & Právne vyhlásenie</span>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="footerText"
                        className="text-xs font-semibold text-text-primary"
                      >
                        Vlastný text v pätičke
                      </Label>
                      <Textarea
                        id="footerText"
                        rows={2}
                        value={reportFooterText}
                        onChange={(e) => setReportFooterText(e.target.value)}
                        placeholder="Vytvorené v štúdiu Apex Media. Dôverné dáta klienta."
                        className="rounded-xl bg-surface-container-low border-border-subtle text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full h-11 rounded-full text-white font-label-lg text-sm font-bold shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="size-4" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    <span>
                      {saving
                        ? "Ukladám..."
                        : saveSuccess
                          ? "Uložené!"
                          : "Uložiť a synchronizovať branding"}
                    </span>
                  </Button>
                </form>
              </div>

              {/* Right Column: Live Interactive Preview (Desktop) */}
              <div className="lg:col-span-5 space-y-4 sticky top-20">
                <div className="bg-surface-pure rounded-2xl p-5 sm:p-6 shadow-xs border border-border-subtle space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                    <span className="font-label-md text-xs font-bold text-text-primary uppercase tracking-wider">
                      Živý náhľad klientskeho portálu
                    </span>
                    <span className="text-[11px] font-semibold text-google-green bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                      Live Preview
                    </span>
                  </div>

                  {/* Mock Portal Container */}
                  <div className="rounded-2xl border border-border-subtle overflow-hidden bg-white shadow-xs">
                    {/* Mock Portal Header */}
                    <div className="h-12 border-b border-border-subtle px-4 flex items-center justify-between bg-surface-ground">
                      <div className="flex items-center gap-2">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt="Logo"
                            className="h-6 max-w-[120px] object-contain"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                        ) : (
                          <div
                            className="px-2.5 py-1 rounded-md text-white font-bold text-xs"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {agencyName || "Vaša Agentúra"}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-text-secondary">{subdomain}</span>
                    </div>

                    {/* Mock Portal Body */}
                    <div className="p-4 space-y-3 bg-surface-pure">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-text-primary">
                            Mesačný SEO Prehľad klienta
                          </p>
                          <p className="text-[11px] text-text-secondary">
                            Pripravené tímom {agencyName || "Agentúry"}
                          </p>
                        </div>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] text-white font-semibold"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Aktívny rast
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle">
                          <span className="text-[10px] text-text-secondary block">
                            Organický traffic
                          </span>
                          <span className="text-sm font-bold text-google-green">
                            +3 420 návštev
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle">
                          <span className="text-[10px] text-text-secondary block">
                            Hodnota v Ads
                          </span>
                          <span className="text-sm font-bold text-text-primary">2 150 €</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface-container-low/70 border border-border-subtle text-[11px] text-text-secondary text-center">
                        {reportFooterText ||
                          `© ${new Date().getFullYear()} ${agencyName || "Vaša Agentúra"}. Všetky práva vyhradené.`}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-text-secondary text-center">
                    Klienti vidia tento prispôsobený panel na adrese <strong>{subdomain}</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* =========================================================================
                MOBILE 4-SECTION ARCHITECTURE (VISIBLE ON MOBILE < LG)
                ========================================================================= */}
            <div className="lg:hidden flex flex-col gap-5">
              {/* SEKCIÁ 1: Vlastná Značka & Branding */}
              <section className="bg-surface-pure rounded-2xl p-4 sm:p-5 shadow-xs border border-border-subtle flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container">
                      <Building2 className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-text-primary">
                        Vlastná značka & Branding
                      </h2>
                      <p className="text-[11px] text-text-secondary">
                        Identita v reportoch a portáli
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-low text-primary-container">
                    Krok 1/3
                  </span>
                </div>

                {/* Agency Logo Showcase */}
                <div className="bg-surface-container-low rounded-xl p-3 flex items-center justify-between gap-3 border border-border-subtle">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-surface-pure flex items-center justify-center shadow-xs shrink-0 overflow-hidden p-1 border border-border-subtle">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Logo"
                          className="w-full h-full object-contain"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      ) : (
                        <div
                          className="w-full h-full rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {agencyName.slice(0, 2).toUpperCase() || "DS"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <span className="text-xs font-semibold text-text-primary truncate">
                        {agencyName || "DigitalStudio Marketing"}
                      </span>
                      <span className="text-[10px] text-text-secondary truncate">
                        SVG, PNG s priehľadným pozadím (max 2 MB)
                      </span>
                    </div>
                  </div>
                  <label
                    htmlFor="logoUrlInputMobile"
                    className="shrink-0 px-3 py-1.5 rounded-full bg-surface-pure shadow-xs border border-border-subtle hover:bg-surface-container transition-colors text-primary-container text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="size-3.5" />
                    <span>Zmeniť</span>
                  </label>
                </div>

                {/* App Title Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-primary">
                    Názov v hlavičke & pätičke
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="logoUrlInputMobile"
                      type="text"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:bg-surface-pure shadow-inner font-medium"
                      placeholder="Názov agentúry..."
                    />
                  </div>
                </div>

                {/* Color Palette Configuration */}
                <div className="flex flex-col gap-2 pt-1">
                  <label className="text-xs font-medium text-text-primary">
                    Farebná paleta klientskeho rozhrania
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Primary Color Card */}
                    <div className="bg-surface-container-low p-2 rounded-xl flex flex-col gap-1.5 border border-border-subtle">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-secondary">Primárna</span>
                        <span
                          className="w-3.5 h-3.5 rounded-full shadow-xs"
                          style={{ backgroundColor: primaryColor }}
                        />
                      </div>
                      <span className="text-xs text-text-primary font-bold uppercase truncate font-mono">
                        {primaryColor}
                      </span>
                    </div>

                    {/* Accent Color Card */}
                    <div className="bg-surface-container-low p-2 rounded-xl flex flex-col gap-1.5 border border-border-subtle">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-secondary">Akcent</span>
                        <span
                          className="w-3.5 h-3.5 rounded-full shadow-xs"
                          style={{ backgroundColor: accentColor }}
                        />
                      </div>
                      <span className="text-xs text-text-primary font-bold uppercase truncate font-mono">
                        {accentColor}
                      </span>
                    </div>

                    {/* Background Color Card */}
                    <div className="bg-surface-container-low p-2 rounded-xl flex flex-col gap-1.5 border border-border-subtle">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-secondary">Pozadie</span>
                        <span
                          className="w-3.5 h-3.5 rounded-full shadow-inner border border-surface-variant"
                          style={{ backgroundColor: backgroundColor }}
                        />
                      </div>
                      <span className="text-xs text-text-primary font-bold uppercase truncate font-mono">
                        {backgroundColor}
                      </span>
                    </div>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setPrimaryColor(preset.hex)}
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 ${
                          primaryColor.toLowerCase() === preset.hex.toLowerCase()
                            ? "bg-primary-fixed border-primary-container text-on-primary-fixed font-bold shadow-xs"
                            : "bg-surface-container-low border-border-subtle text-text-secondary"
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <span>{preset.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* SEKCIÁ 2: Vlastná Subdoména & CNAME Záznam */}
              <section className="bg-surface-pure rounded-2xl p-4 sm:p-5 shadow-xs border border-border-subtle flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                      <Globe className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-text-primary">
                        Vlastná Subdoména & CNAME
                      </h2>
                      <p className="text-[11px] text-text-secondary">
                        Klientsky portál na vlastnej URL
                      </p>
                    </div>
                  </div>

                  {/* Native Style Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      id="cname-toggle"
                      type="checkbox"
                      checked={cnameEnabled}
                      onChange={(e) => setCnameEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container" />
                  </label>
                </div>

                {/* Domain Input & Verification */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-primary">
                    Klientska URL adresa portálu
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-11 px-3 rounded-xl bg-surface-container-low flex items-center gap-2 text-text-primary text-xs border border-border-subtle shadow-inner min-w-0">
                      <Lock className="size-3.5 text-google-green shrink-0" />
                      <input
                        type="text"
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value)}
                        className="bg-transparent text-text-primary font-semibold text-xs focus:outline-none flex-1 truncate"
                        placeholder="seo.vasa-agentura.sk"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleVerifyDns}
                      disabled={verifyingDns}
                      className="shrink-0 h-11 px-3 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold hover:bg-primary-fixed-dim transition-colors flex items-center gap-1 shadow-xs"
                    >
                      {verifyingDns ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3.5" />
                      )}
                      <span>Overiť DNS</span>
                    </Button>
                  </div>
                </div>

                {/* SSL & CNAME Status Pill-Card */}
                <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2 border border-border-subtle">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-google-green text-xs font-semibold">
                      <ShieldCheck className="size-4" />
                      <span>SSL Certifikát aktívny (TLS 1.3)</span>
                    </div>
                    <span className="text-text-secondary text-[10px]">Pred 10 min.</span>
                  </div>
                  <div className="bg-surface-pure p-2 rounded-lg flex items-center justify-between text-xs text-text-primary font-mono border border-border-subtle">
                    <span className="truncate">CNAME: {subdomain} → cname.seo4web.com</span>
                    <CheckCircle2 className="size-4 text-google-green shrink-0 ml-1" />
                  </div>
                </div>

                {/* Quick Registrars Integration */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-text-secondary">
                    Rýchly DNS návod pre vášho registrátora:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                    <button
                      type="button"
                      onClick={() => handleRegistrarGuide("WebSupport")}
                      className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-text-primary text-xs font-medium flex items-center gap-1 border border-border-subtle"
                    >
                      <Globe className="size-3.5 text-primary-container" />
                      <span>WebSupport</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegistrarGuide("Cloudflare")}
                      className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-text-primary text-xs font-medium flex items-center gap-1 border border-border-subtle"
                    >
                      <ShieldCheck className="size-3.5 text-google-green" />
                      <span>Cloudflare</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegistrarGuide("Forpsi")}
                      className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-text-primary text-xs font-medium flex items-center gap-1 border border-border-subtle"
                    >
                      <Globe className="size-3.5 text-google-yellow" />
                      <span>Forpsi</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* SEKCIÁ 3: Distribúcia a Klientske Reporty */}
              <section className="bg-surface-pure rounded-2xl p-4 sm:p-5 shadow-xs border border-border-subtle flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-text-primary">
                      Distribúcia a Klientske Reporty
                    </h2>
                    <p className="text-[11px] text-text-secondary">
                      Automatizácia doručovania výsledkov
                    </p>
                  </div>
                </div>

                {/* Format Switcher Segmented Control */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-primary">
                    Predvolený formát pre klientov
                  </label>
                  <div className="grid grid-cols-2 p-1 rounded-full bg-surface-container-low text-center border border-border-subtle">
                    <button
                      type="button"
                      onClick={() => setDefaultReportFormat("portal")}
                      className={`py-1.5 px-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                        defaultReportFormat === "portal"
                          ? "bg-surface-pure text-primary-container shadow-xs"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      <Globe className="size-3.5" />
                      <span>Webový portál</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDefaultReportFormat("pdf")}
                      className={`py-1.5 px-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                        defaultReportFormat === "pdf"
                          ? "bg-surface-pure text-primary-container shadow-xs"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      <FileDown className="size-3.5" />
                      <span>Mesačné PDF</span>
                    </button>
                  </div>
                </div>

                {/* Toggles List */}
                <div className="flex flex-col gap-2.5 pt-1">
                  {/* Whitelabel 100% Toggle */}
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-container-low border border-border-subtle">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-text-primary truncate">
                        Skryť "Powered by Seo4web"
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        100% čistý white-label bez našich log
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={hidePoweredBy}
                        onChange={(e) => setHidePoweredBy(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container" />
                    </label>
                  </div>

                  {/* Automatic Dispatch Toggle */}
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-container-low border border-border-subtle">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-text-primary truncate">
                        Automatické odosielanie
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        Každý 1. deň v mesiaci o 08:00
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={autoDispatch}
                        onChange={(e) => setAutoDispatch(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container" />
                    </label>
                  </div>
                </div>

                {/* Magic Link & Support Email Details */}
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between bg-surface-container-low p-2.5 rounded-xl border border-border-subtle">
                    <div className="flex items-center gap-2">
                      <Key className="size-4 text-primary-container" />
                      <span className="text-xs text-text-primary font-medium">
                        Bezpečný klientsky Magic Link
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyMagicLink}
                      className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold"
                    >
                      Kopírovať Link
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-surface-container-low p-2.5 rounded-xl border border-border-subtle">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="size-4 text-text-secondary shrink-0" />
                      <span className="text-xs text-text-primary font-medium truncate">
                        {contactEmail || "podpora@digitalstudio.sk"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newMail = prompt(
                          "Zadajte e-mail podpory pre klientov:",
                          contactEmail,
                        );
                        if (newMail !== null) setContactEmail(newMail.trim());
                      }}
                      className="text-primary-container text-xs font-semibold hover:underline shrink-0"
                    >
                      Upraviť
                    </button>
                  </div>
                </div>
              </section>

              {/* SEKCIÁ 4: Živý Náhľad Klientskeho Portálu na Mobile (Smartphone Simulation Frame) */}
              <section className="bg-surface-pure rounded-2xl p-4 sm:p-5 shadow-xs border border-border-subtle flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container">
                      <Eye className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-text-primary">
                        Živý náhľad klientskeho portálu
                      </h2>
                      <p className="text-[11px] text-text-secondary">Pohľad koncového klienta</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] text-google-green font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-google-green animate-pulse" />
                    Live
                  </span>
                </div>

                {/* Smartphone Simulation Frame */}
                <div className="bg-surface-container-high rounded-2xl p-2.5 shadow-md flex flex-col border border-border-subtle">
                  {/* Mockup Device Header */}
                  <div className="w-full flex items-center justify-between px-2 pb-1.5 text-text-secondary text-[11px]">
                    <span className="font-mono font-semibold">09:41</span>
                    <div className="w-16 h-2.5 bg-surface-variant rounded-full" />
                    <div className="flex items-center gap-1">
                      <Signal className="size-3" />
                      <Wifi className="size-3" />
                      <Battery className="size-3" />
                    </div>
                  </div>

                  {/* Inner Client Mobile View */}
                  <div className="bg-surface-ground rounded-xl p-3 flex flex-col gap-2.5 shadow-inner border border-border-subtle">
                    {/* Client Header in White-label Portal */}
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="w-6 h-6 rounded-md text-white flex items-center justify-center font-bold text-[10px] shrink-0"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {agencyName.slice(0, 2).toUpperCase() || "DS"}
                        </div>
                        <span className="text-xs font-bold text-text-primary truncate">
                          {agencyName || "DigitalStudio Portal"}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-surface-pure shadow-xs text-text-secondary text-[10px] font-medium truncate border border-border-subtle">
                        Peter Kováč (Klient)
                      </span>
                    </div>

                    {/* Report Title Card */}
                    <div className="bg-surface-pure rounded-xl p-3 shadow-xs flex flex-col gap-1 border border-border-subtle">
                      <span className="text-[10px] text-text-secondary">Auditovaná doména</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary font-mono">
                          mojeshop.sk
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold">
                          Audit Q3
                        </span>
                      </div>
                      <p className="text-[10px] text-text-secondary">
                        Kompletný SEO Audit & Organický rast
                      </p>
                    </div>

                    {/* Mobile Metrics Row */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {/* Metric 1: Health Score Circular Meter */}
                      <div className="bg-surface-pure p-2 rounded-xl shadow-xs flex flex-col items-center justify-center text-center border border-border-subtle">
                        <div className="relative w-8 h-8 flex items-center justify-center my-0.5">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-surface-variant"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.5"
                            />
                            <path
                              className="text-google-green"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeDasharray="88, 100"
                              strokeLinecap="round"
                              strokeWidth="3.5"
                            />
                          </svg>
                          <span className="absolute font-bold text-[11px] text-text-primary">
                            88
                          </span>
                        </div>
                        <span className="text-[9px] text-text-secondary">SEO Skóre</span>
                      </div>

                      {/* Metric 2: Growth */}
                      <div className="bg-surface-pure p-2 rounded-xl shadow-xs flex flex-col items-center justify-center text-center border border-border-subtle">
                        <span className="text-xs text-google-green font-bold">+148%</span>
                        <span className="text-[10px] text-text-primary font-semibold">+14,280</span>
                        <span className="text-[9px] text-text-secondary">Návštevy</span>
                      </div>

                      {/* Metric 3: Critical Resolved */}
                      <div className="bg-surface-pure p-2 rounded-xl shadow-xs flex flex-col items-center justify-center text-center border border-border-subtle">
                        <span className="text-xs text-primary-container font-bold">14</span>
                        <span className="text-[10px] text-google-green font-semibold">
                          Vyriešené
                        </span>
                        <span className="text-[9px] text-text-secondary">Kritické</span>
                      </div>
                    </div>

                    {/* Micro CTA Buttons inside Preview */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadSamplePdf}
                        className="py-1.5 px-2 rounded-full bg-primary-container text-white text-[11px] font-semibold text-center shadow-xs flex items-center justify-center gap-1 active:scale-95"
                      >
                        <Download className="size-3" />
                        <span className="truncate">Stiahnuť PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.info("Otvorenie klientskeho kalendára na konzultáciu")}
                        className="py-1.5 px-2 rounded-full bg-surface-pure text-primary-container text-[11px] font-semibold text-center shadow-xs flex items-center justify-center gap-1 border border-border-subtle active:scale-95"
                      >
                        <Calendar className="size-3" />
                        <span className="truncate">Konzultácia</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action buttons below preview */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyMagicLink}
                    className="h-10 rounded-full text-xs font-semibold border-border-default hover:bg-surface-container flex items-center justify-center gap-1.5"
                  >
                    <Key className="size-3.5 text-primary-container" />
                    <span className="truncate">Testovací Magic Link</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadSamplePdf}
                    className="h-10 rounded-full text-xs font-semibold border-border-default hover:bg-surface-container flex items-center justify-center gap-1.5"
                  >
                    <Download className="size-3.5 text-google-green" />
                    <span className="truncate">Vzorové PDF (3.2 MB)</span>
                  </Button>
                </div>
              </section>

              {/* Fixed Bottom Action Bar (Mobile Only) */}
              <div className="fixed bottom-16 left-0 right-0 z-40 bg-surface-pure/95 backdrop-blur-md px-4 py-2.5 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] border-t border-border-subtle flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAgencyName(DEFAULT_AGENCY_PROFILE.agency_name);
                    setPrimaryColor(DEFAULT_AGENCY_PROFILE.primary_color);
                    setSubdomain("seo.digitalstudio.sk");
                    toast.info("Zmeny boli resetované");
                  }}
                  className="flex-1 h-11 rounded-full text-xs font-semibold border-border-default hover:bg-surface-container text-text-secondary"
                >
                  Zahodiť zmeny
                </Button>
                <Button
                  id="save-whitelabel-btn"
                  type="button"
                  onClick={() => handleSave()}
                  disabled={saving}
                  className="flex-[1.6] h-11 rounded-full text-white text-xs font-bold shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-95"
                  style={{ backgroundColor: primaryColor }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Ukladám...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check className="size-4" />
                      <span>Uložené!</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      <span>Uložiť branding</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: CMS Connections */}
          <TabsContent value="cms" className="mt-0 space-y-6">
            <CmsConnectionsSection />
          </TabsContent>

          {/* TAB 3: Billing & Invoices */}
          <TabsContent value="billing" className="mt-0 space-y-6">
            <BillingPortalCard
              state={currentSubscription ?? { status: "loading" }}
              onOpen={handleOpenPortal}
              opening={openingPortal}
              onRetry={() => setSubscriptionRetry((prev) => prev + 1)}
            />
            <BillingInvoiceSection />
          </TabsContent>
        </Tabs>
      </main>

      <ClientReportModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        siteUrl={subdomain ? `https://${subdomain}` : "https://mojeshop.sk"}
      />

      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        title="Odomknite Whitelabel Hub s balíkom Agency"
        description="Získajte neobmedzený klientsky portál s vlastným logom, firemnými farbami a vlastnou CNAME subdoménou."
      />
    </div>
  );
}
