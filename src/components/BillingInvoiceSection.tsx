import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getUserSubscription, updateCompanyBillingDetails } from "@/lib/billing.functions";
import { isValidDIC, isValidICDPH, isValidICO, PLANS, type PlanId } from "@/lib/slovak-billing";
import { checkoutPlanLabel } from "@/lib/billing-ui";
import { PaywallModal } from "@/components/PaywallModal";
import { useViewerRole } from "@/hooks/use-viewer-role";

interface BillingAddressState {
  line1?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

export function BillingInvoiceSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{ userId: string; message: string } | null>(null);
  const [loadRetry, setLoadRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { isAdmin } = useViewerRole();

  // Plan info
  const [plan, setPlan] = useState<PlanId>("free");
  const [status, setStatus] = useState<string>("unknown");
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState<string | null>(null);
  const [lastInvoiceUrl, setLastInvoiceUrl] = useState<string | null>(null);

  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [ico, setIco] = useState("");
  const [dic, setDic] = useState("");
  const [icDph, setIcDph] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("Slovensko");

  // Validation errors
  const [icoError, setIcoError] = useState("");
  const [dicError, setDicError] = useState("");
  const [icDphError, setIcDphError] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setLoadedUserId(null);
      return;
    }
    const currentUserId = user.id;
    let active = true;

    async function fetchSubscription() {
      setLoading(true);
      setLoadError(null);
      try {
        const sub = await getUserSubscription();
        if (!sub) throw new Error("Nepodarilo sa načítať fakturačné údaje.");
        if (active && sub) {
          setPlan(sub.plan);
          setStatus(sub.status || "unknown");
          setCurrentPeriodEnd(sub.currentPeriodEnd);
          setCompanyName(sub.companyName || "");
          setIco(sub.ico || "");
          setDic(sub.dic || "");
          setIcDph(sub.icDph || "");
          setLastInvoiceNumber(sub.lastInvoiceNumber || null);
          setLastInvoiceUrl(sub.lastInvoiceUrl || null);

          const addr = sub.billingAddress as BillingAddressState | null;
          setAddress(addr?.line1 || "");
          setCity(addr?.city || "");
          setZip(addr?.postal_code || "");
          setCountry(addr?.country || "Slovensko");
          setIcoError("");
          setDicError("");
          setIcDphError("");
          setLoadedUserId(currentUserId);
        }
      } catch (err) {
        if (active) {
          setLoadError({
            userId: currentUserId,
            message: err instanceof Error ? err.message : "Nepodarilo sa načítať fakturačné údaje.",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchSubscription();

    return () => {
      active = false;
    };
  }, [user, loadRetry]);

  // Live validators
  const handleIcoChange = (val: string) => {
    setIco(val);
    if (!val.trim()) {
      setIcoError("");
    } else if (!isValidICO(val)) {
      setIcoError("Neplatné IČO (8 číslic s kontrolným súčtom modulo 11).");
    } else {
      setIcoError("");
    }
  };

  const handleDicChange = (val: string) => {
    setDic(val);
    if (!val.trim()) {
      setDicError("");
    } else if (!isValidDIC(val)) {
      setDicError("Neplatné DIČ (10 číslic, začína 10, 20 alebo 21 a deliteľné 11).");
    } else {
      setDicError("");
    }
  };

  const handleIcDphChange = (val: string) => {
    setIcDph(val);
    if (!val.trim()) {
      setIcDphError("");
    } else if (!isValidICDPH(val)) {
      setIcDphError("Neplatné IČ DPH (očakávaný formát: SK + 10-miestne DIČ).");
    } else {
      setIcDphError("");
    }
  };

  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Pre uloženie fakturačných údajov sa musíte prihlásiť.");
      return;
    }

    if (ico && !isValidICO(ico)) {
      toast.error("Zadané IČO má neplatný formát.");
      return;
    }
    if (dic && !isValidDIC(dic)) {
      toast.error("Zadané DIČ má neplatný formát.");
      return;
    }
    if (icDph && !isValidICDPH(icDph)) {
      toast.error("Zadané IČ DPH má neplatný formát.");
      return;
    }

    setSaving(true);
    try {
      await updateCompanyBillingDetails({
        data: {
          companyName: companyName.trim() || undefined,
          ico: ico.trim() || undefined,
          dic: dic.trim() || undefined,
          icDph: icDph.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          zip: zip.trim() || undefined,
          country: country.trim() || "Slovensko",
        },
      });
      toast.success("Fakturačné údaje boli úspešne uložené.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uloženie fakturačných údajov zlyhalo.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (loadError?.userId === user.id) {
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-danger-border bg-card p-5">
        <p className="text-sm">{loadError.message}</p>
        <Button type="button" variant="outline" onClick={() => setLoadRetry((value) => value + 1)}>
          Skúsiť načítať znova
        </Button>
      </div>
    );
  }

  if (loading || loadedUserId !== user.id) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-pure p-6 flex items-center justify-center gap-3 text-text-secondary text-sm shadow-xs">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none text-primary-container" />
        <span>Načítavam fakturačné údaje a predplatné…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Card: Current Plan & Invoice Download */}
      <div className="rounded-xl border border-border-default bg-surface-pure p-5 md:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary-fixed text-primary border border-primary-fixed-dim/50">
              <CreditCard className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-text-primary">
                  Fakturačné údaje a predplatné
                </h3>
                <Badge
                  variant="outline"
                  className={
                    plan === "agency"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 font-bold"
                      : plan === "pro"
                        ? "border-primary-fixed-dim bg-primary-fixed text-on-primary-fixed font-bold"
                        : "border-border-default bg-surface-container text-text-secondary"
                  }
                >
                  {PLANS[plan].name}
                </Badge>
                {plan !== "free" && (status === "active" || status === "trialing") && (
                  <Badge
                    variant="outline"
                    className="border-google-green/30 bg-google-green/10 text-on-secondary-container text-[10px] font-semibold"
                  >
                    Aktívne
                  </Badge>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {currentPeriodEnd
                  ? `Koniec fakturačného obdobia: ${new Date(currentPeriodEnd).toLocaleDateString("sk-SK")}`
                  : "Bezplatný plán (1 projekt, 1 mesačný snapshot)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isAdmin ? null : plan === "free" ? (
              <Button
                size="sm"
                onClick={() => setPaywallOpen(true)}
                className="gap-1.5 text-xs font-semibold rounded-full bg-primary-container hover:bg-primary text-on-primary-container"
              >
                <Sparkles className="size-3.5" />
                Aktivovať {checkoutPlanLabel("pro")}
              </Button>
            ) : lastInvoiceUrl ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-2 text-xs font-semibold rounded-full border-border-default text-primary hover:bg-primary-fixed/40"
              >
                <a href={lastInvoiceUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="size-3.5" />
                  Otvoriť poslednú faktúru
                </a>
              </Button>
            ) : (
              <div className="text-xs text-text-secondary italic flex items-center gap-1.5">
                <FileText className="size-3.5" />
                Faktúra zatiaľ nie je k dispozícii
              </div>
            )}
          </div>
        </div>

        {/* Invoice Summary Pill */}
        {lastInvoiceNumber && (
          <div className="mt-4 pt-4 border-t border-border-subtle flex flex-wrap items-center justify-between text-xs text-text-secondary gap-2">
            <span className="flex items-center gap-1.5 font-medium text-text-primary">
              <CheckCircle2 className="size-4 text-google-green" />
              Posledná vystavená faktúra:{" "}
              <strong className="font-mono text-text-primary">{lastInvoiceNumber}</strong>
            </span>
            {lastInvoiceUrl && (
              <a
                href={lastInvoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
              >
                Otvoriť faktúru <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* 2. Billing Details Form */}
      <div className="rounded-xl border border-border-default bg-surface-pure p-5 md:p-6 shadow-xs">
        <div className="flex items-center gap-2 font-semibold text-sm mb-4 text-text-primary">
          <Building2 className="size-4 text-primary" />
          <span>Firemné fakturačné údaje</span>
        </div>

        <form onSubmit={handleSaveBilling} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Obchodné meno */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="billingCompanyName" className="text-xs font-medium text-text-primary">
                Obchodné meno spoločnosti / Živnostník
              </Label>
              <Input
                id="billingCompanyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="napr. Moja SEO Agentúra s.r.o."
                className="bg-surface-container-low border-border-default text-text-primary placeholder:text-text-secondary/60"
              />
            </div>

            {/* IČO */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="billingIco" className="text-xs font-medium text-text-primary">
                  IČO (8 číslic)
                </Label>
                {ico && !icoError && (
                  <span className="text-[10px] text-google-green font-semibold flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Platné
                  </span>
                )}
              </div>
              <Input
                id="billingIco"
                value={ico}
                onChange={(e) => handleIcoChange(e.target.value)}
                placeholder="12345678"
                className={`bg-surface-container-low text-text-primary placeholder:text-text-secondary/60 ${
                  icoError
                    ? "border-destructive focus-visible:ring-destructive"
                    : "border-border-default"
                }`}
              />
              {icoError && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <ShieldAlert className="size-3" /> {icoError}
                </p>
              )}
            </div>

            {/* DIČ */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="billingDic" className="text-xs font-medium text-text-primary">
                  DIČ (10 číslic)
                </Label>
                {dic && !dicError && (
                  <span className="text-[10px] text-google-green font-semibold flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Platné
                  </span>
                )}
              </div>
              <Input
                id="billingDic"
                value={dic}
                onChange={(e) => handleDicChange(e.target.value)}
                placeholder="2021234567"
                className={`bg-surface-container-low text-text-primary placeholder:text-text-secondary/60 ${
                  dicError
                    ? "border-destructive focus-visible:ring-destructive"
                    : "border-border-default"
                }`}
              />
              {dicError && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <ShieldAlert className="size-3" /> {dicError}
                </p>
              )}
            </div>

            {/* IČ DPH */}
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="billingIcDph" className="text-xs font-medium text-text-primary">
                  IČ DPH (nepovinné, slovenský formát SK + DIČ)
                </Label>
                {icDph && !icDphError && (
                  <span className="text-[10px] text-google-green font-semibold flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Platný formát
                  </span>
                )}
              </div>
              <Input
                id="billingIcDph"
                value={icDph}
                onChange={(e) => handleIcDphChange(e.target.value)}
                placeholder="SK2021234567"
                className={`bg-surface-container-low text-text-primary placeholder:text-text-secondary/60 ${
                  icDphError
                    ? "border-destructive focus-visible:ring-destructive"
                    : "border-border-default"
                }`}
              />
              {icDphError ? (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <ShieldAlert className="size-3" /> {icDphError}
                </p>
              ) : (
                <p className="text-[11px] text-text-secondary">
                  Platný formát nie je potvrdením registrácie vo VIES ani nároku na prenesenie
                  daňovej povinnosti. Konečnú daň si skontrolujte pri platbe v Stripe.
                </p>
              )}
            </div>

            {/* Ulica a číslo */}
            <div className="space-y-1.5">
              <Label htmlFor="billingAddress" className="text-xs font-medium text-text-primary">
                Ulica a súpisné číslo
              </Label>
              <Input
                id="billingAddress"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Hlavná 42"
                className="bg-surface-container-low border-border-default text-text-primary placeholder:text-text-secondary/60"
              />
            </div>

            {/* Mesto */}
            <div className="space-y-1.5">
              <Label htmlFor="billingCity" className="text-xs font-medium text-text-primary">
                Mesto
              </Label>
              <Input
                id="billingCity"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bratislava"
                className="bg-surface-container-low border-border-default text-text-primary placeholder:text-text-secondary/60"
              />
            </div>

            {/* PSČ */}
            <div className="space-y-1.5">
              <Label htmlFor="billingZip" className="text-xs font-medium text-text-primary">
                PSČ
              </Label>
              <Input
                id="billingZip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="811 01"
                className="bg-surface-container-low border-border-default text-text-primary placeholder:text-text-secondary/60"
              />
            </div>

            {/* Krajina */}
            <div className="space-y-1.5">
              <Label htmlFor="billingCountry" className="text-xs font-medium text-text-primary">
                Krajina sídla
              </Label>
              <select
                id="billingCountry"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full h-9 rounded-md border border-border-default bg-surface-container-low text-text-primary px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container/30 focus:border-primary-container"
              >
                <option value="Slovensko">Slovenská republika (SK)</option>
                <option value="Česká republika">Česká republika (CZ)</option>
                <option value="Nemecko">Nemecko (DE)</option>
                <option value="Rakúsko">Rakúsko (AT)</option>
                <option value="Poľsko">Poľsko (PL)</option>
                <option value="Maďarsko">Maďarsko (HU)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <Button
              type="submit"
              disabled={saving || Boolean(icoError || dicError || icDphError)}
              className="gap-2 text-xs font-semibold rounded-full bg-primary-container hover:bg-primary text-on-primary-container px-5"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
              ) : (
                <Save className="size-3.5" />
              )}
              {saving ? "Ukladám údaje…" : "Uložiť fakturačné údaje"}
            </Button>
          </div>
        </form>
      </div>

      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        plan="pro"
        title="Prejdite na Pro balík SEO4WEB"
        description="Získajte 5 projektov, neobmedzený Decay Radar, CTR Booster a automatické slovenské faktúry pri každej platbe."
      />
    </div>
  );
}
