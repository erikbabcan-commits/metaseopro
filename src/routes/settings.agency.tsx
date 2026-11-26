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
  const [contactEmail, setContactEmail] = useState(DEFAULT_AGENCY_PROFILE.contact_email || "");
  const [reportFooterText, setReportFooterText] = useState(
    DEFAULT_AGENCY_PROFILE.report_footer_text || "",
  );
  const [subdomain, setSubdomain] = useState("seo.digitalstudio.sk");

  const [saving, setSaving] = useState(false);
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

  // Billing errors remain visible and do not block independent branding data
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

  // Load existing agency profile independently
  useEffect(() => {
    if (!user) return;
    const currentUserId = user.id;
    let active = true;

    async function fetchData() {
      setLoadingData(true);
      try {
        const { data: profile, error: profileError } = await supabase
          .from("agency_profiles")
          .select("*")
          .eq("user_id", currentUserId)
          .maybeSingle();

        if (profileError) throw profileError;
        if (active && profile) {
          setAgencyName(profile.agency_name || DEFAULT_AGENCY_PROFILE.agency_name);
          setLogoUrl(profile.logo_url || "");
          setPrimaryColor(profile.primary_color || DEFAULT_AGENCY_PROFILE.primary_color);
          setContactEmail(profile.contact_email || user?.email || "");
          setReportFooterText(
            profile.report_footer_text || DEFAULT_AGENCY_PROFILE.report_footer_text || "",
          );
        } else if (active && user?.email) {
          setContactEmail(user.email);
        }
      } catch (err) {
        console.error("Error loading agency profile:", err);
        if (active) toast.error("Nepodarilo sa načítať nastavenia agentúry.");
      } finally {
        if (active) setLoadingData(false);
      }
    }

    void fetchData();
    return () => {
      active = false;
    };
  }, [user]);

  const handleOpenPortal = async () => {
    if (
      !userId ||
      currentSubscription?.status !== "ready" ||
      !currentSubscription.hasStripeCustomer ||
      openingPortal
    ) {
      return;
    }

    const currentUserId = userId;
    setOpeningPortal(true);
    try {
      const session = await startPortal({ data: {} });
      if (activeUserId.current !== currentUserId) return;
      if (!session.url) throw new Error("Nepodarilo sa otvoriť zákaznícky portál Stripe.");
      window.location.assign(session.url);
    } catch (error) {
      if (activeUserId.current === currentUserId) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nepodarilo sa otvoriť zákaznícky portál Stripe.",
        );
      }
    } finally {
      if (activeUserId.current === currentUserId) setOpeningPortal(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Pre uloženie nastavení sa musíte prihlásiť.");
      navigate({ to: "/login", search: { redirect: "/settings/agency" } });
      return;
    }

    if (!agencyName.trim()) {
      toast.error("Zadajte prosím názov agentúry.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        agency_name: agencyName.trim(),
        logo_url: logoUrl.trim() || null,
        primary_color: primaryColor,
        contact_email: contactEmail.trim() || null,
        report_footer_text: reportFooterText.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("agency_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (error) {
        throw error;
      }

      toast.success("Branding agentúry bol úspešne uložený!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepodarilo sa uložiť profil agentúry.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background font-sans text-on-surface antialiased pb-20">
        <AppHeader />
        <Toaster />
        <main className="mx-auto flex max-w-5xl min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <Loader2 className="size-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-medium text-text-secondary">
            {authLoading ? "Overujem prihlásenie…" : "Presmerovávam na prihlásenie…"}
          </p>
        </main>
      </div>
    );
  }

  const isAgencyPlan = userPlan === "agency";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed-variant">
      <Toaster />
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-28 md:pb-16 space-y-6">
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
                Aktivujte balík Agency a získajte neobmedzený klientsky portál s vlastným logom,
                subdoménou a automatickými mesačnými reportmi.
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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

                  {/* Primary Color & Palette Card */}
                  <div className="bg-surface-pure rounded-2xl p-5 sm:p-6 shadow-xs border border-border-subtle space-y-4">
                    <div className="flex items-center gap-2 font-bold text-sm text-text-primary pb-3 border-b border-border-subtle">
                      <Palette className="size-4 text-primary" />
                      <span>Firemná farba & Vizuálny akcent</span>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-semibold text-text-primary block">
                        Vyberte si z pripravených farieb alebo zadajte HEX kód
                      </Label>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setPrimaryColor(preset.hex)}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition-all ${
                              primaryColor === preset.hex
                                ? "border-primary bg-primary/5 font-semibold text-primary ring-1 ring-primary"
                                : "border-border-subtle hover:bg-surface-container-low text-text-secondary"
                            }`}
                          >
                            <span
                              className="size-3.5 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: preset.hex }}
                            />
                            <span className="truncate">{preset.name.split(" ")[0]}</span>
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          placeholder="#1a73e8"
                          className="w-36 rounded-xl bg-surface-container-low border-border-subtle font-mono text-xs"
                        />
                        <div
                          className="size-8 rounded-xl border border-border-subtle shadow-xs shrink-0"
                          style={{ backgroundColor: primaryColor }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom Subdomain Card */}
                  <div className="bg-surface-pure rounded-2xl p-5 sm:p-6 shadow-xs border border-border-subtle space-y-4">
                    <div className="flex items-center gap-2 font-bold text-sm text-text-primary pb-3 border-b border-border-subtle">
                      <Globe className="size-4 text-primary" />
                      <span>Vlastná subdoména klientskeho portálu (CNAME)</span>
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
                    ) : (
                      <Check className="size-4" />
                    )}
                    <span>Uložiť a synchronizovať branding</span>
                  </Button>
                </form>
              </div>

              {/* Right Column: Live Interactive Preview */}
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
          </TabsContent>

          {/* TAB 2: CMS Connections */}
          <TabsContent value="cms" className="mt-0 space-y-6">
            <CmsConnectionsSection />
          </TabsContent>

          {/* TAB 3: Billing & Invoices */}
          <TabsContent value="billing" className="mt-0 space-y-6">
            <BillingPortalCard
              subscription={currentSubscription}
              onOpenPortal={handleOpenPortal}
              openingPortal={openingPortal}
              onRetrySubscription={() => setSubscriptionRetry((prev) => prev + 1)}
            />
            <BillingInvoiceSection />
          </TabsContent>
        </Tabs>
      </main>

      <ClientReportModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        agencyProfile={{
          agency_name: agencyName,
          logo_url: logoUrl,
          primary_color: primaryColor,
          contact_email: contactEmail,
          report_footer_text: reportFooterText,
        }}
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
