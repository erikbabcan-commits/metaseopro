import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Sparkles, ShieldCheck, Zap, Lock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { createCheckoutSession } from "@/lib/billing.functions";
import {
  isValidDIC,
  isValidICDPH,
  isValidICO,
  normalizeICDPH,
  AUDIT_PASS_CHECKOUT_URL,
  PRO_DIRECT_CHECKOUT_URL,
} from "@/lib/slovak-billing";
import { checkoutPlanLabel } from "@/lib/billing-ui";
import {
  PRICE_LINE_LABEL,
  PRICE_SHORT_LABEL,
  TRIAL_CTA,
  TRIAL_LABEL,
} from "@/lib/pricing-proposal";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  feature?: string;
  plan?: "pro" | "agency";
}

export function PaywallModal({
  open,
  onOpenChange,
  title = "Odomknite prémiové funkcie SEO4WEB",
  description = "Vyberte si balík prispôsobený vašim potrebám. Bezpečné platby cez Stripe so slovenskou faktúrou.",
  plan = "pro",
}: PaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "agency" | "audit_pass">(plan || "pro");
  const [loading, setLoading] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [ico, setIco] = useState("");
  const [dic, setDic] = useState("");
  const [icDph, setIcDph] = useState("");
  const checkoutRequestId = useRef<string | null>(null);

  useEffect(() => {
    if (plan) {
      setSelectedPlan(plan);
    }
  }, [plan, open]);

  // A retry after a lost response reuses the same checkout intent. Editing or reopening starts another.
  useEffect(() => {
    checkoutRequestId.current = null;
  }, [open, selectedPlan, companyName, ico, dic, icDph]);

  const isAgency = selectedPlan === "agency";
  const isAuditPass = selectedPlan === "audit_pass";
  const startCheckout = useServerFn(createCheckoutSession);

  const handleUpgrade = async () => {
    // Validate IČO if provided
    if (ico && !isValidICO(ico)) {
      toast.error("Zadané IČO má neplatný formát alebo kontrolnú číslicu.");
      return;
    }
    // Validate DIČ if provided
    if (dic && !isValidDIC(dic)) {
      toast.error("Neplatné DIČ (musí mať 10 číslic a byť deliteľné 11).");
      return;
    }
    // Validate IČ DPH if provided
    const normalizedIcDph = icDph ? normalizeICDPH(icDph) : "";
    if (normalizedIcDph && !isValidICDPH(normalizedIcDph)) {
      toast.error("Neplatné IČ DPH (očakávaný formát: SK + 10-miestne DIČ).");
      return;
    }

    setLoading(true);
    try {
      checkoutRequestId.current ??= crypto.randomUUID();
      const res = await startCheckout({
        data: {
          requestId: checkoutRequestId.current,
          plan: selectedPlan === "agency" ? "agency" : "pro",
          companyName: companyName.trim() || undefined,
          ico: ico.trim() || undefined,
          dic: dic.trim() || undefined,
          icDph: normalizedIcDph || undefined,
        },
      });

      if (res?.url) {
        window.location.href = res.url;
      } else {
        toast.error("Nepodarilo sa vytvoriť platobnú reláciu.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chyba pri inicializácii platby.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
            <Sparkles className="size-4" />
            <span>
              {selectedPlan === "audit_pass"
                ? "B2B Fast-Track Audit Pass (99 € jednorazovo)"
                : selectedPlan === "agency"
                  ? `SEO4WEB Agency (${PRICE_LINE_LABEL})`
                  : `SEO4WEB Pro (${PRICE_LINE_LABEL})`}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            {description} Predplatné máš {TRIAL_LABEL}.
          </DialogDescription>
        </DialogHeader>

        {/* Tier Selector */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-lg border text-xs font-medium my-1">
          <button
            type="button"
            onClick={() => setSelectedPlan("pro")}
            className={`py-1.5 px-2 rounded-md transition-all text-center ${
              selectedPlan === "pro"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pro <span className="text-[10px] opacity-75">({PRICE_SHORT_LABEL})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlan("agency")}
            className={`py-1.5 px-2 rounded-md transition-all text-center ${
              selectedPlan === "agency"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Agency <span className="text-[10px] opacity-75">({PRICE_SHORT_LABEL})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlan("audit_pass")}
            className={`py-1.5 px-2 rounded-md transition-all text-center ${
              selectedPlan === "audit_pass"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Audit Pass <span className="text-[10px] opacity-75">(99 €)</span>
          </button>
        </div>

        <div className="space-y-4 py-1">
          <div className="rounded-xl border bg-muted/30 p-4 space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isAuditPass
                ? "V balíku Fast-Track Audit Pass získate:"
                : isAgency
                  ? "V balíku Agency získate:"
                  : "V balíku Pro získate:"}
            </div>
            <div className="grid gap-2 text-sm">
              {isAuditPass ? (
                <>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-success-foreground shrink-0" />
                    <span>Kompletný audit webu a identifikácia kanibalizácie kľúčových slov</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-success-foreground shrink-0" />
                    <span>Detekcia prepadov organickej návštevnosti + oprava TOP 5 kategórií</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-success-foreground shrink-0" />
                    <span>
                      <strong className="text-foreground">1 mesiac balíka Pro v cene</strong>{" "}
                      (neobmedzené audity a AI články)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-success-foreground shrink-0" />
                    <span>Jednorazová platba bez viazanosti s okamžitou aktiváciou</span>
                  </div>
                </>
              ) : isAgency ? (
                <>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-success-foreground shrink-0" />
                    <span>Whitelabel mesačné PDF reporty s logom vašej agentúry</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-success-foreground shrink-0" />
                    <span>Neobmedzený počet sledovaných klientskych webov a projektov</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-success-foreground shrink-0" />
                    <span>Sledovanie konkurencie a prioritné AI SEO generovanie</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-success-foreground shrink-0" />
                    <span>Fakturácia so slovenským IČO a odpočtom DPH pre agentúru</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-success-foreground shrink-0" />
                    <span>Neobmedzená analýza URL a domén (žiadny limit 3 URL)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-success-foreground shrink-0" />
                    <span>Plný Content Decay Radar so živými dátami z Google Search Console</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-success-foreground shrink-0" />
                    <span>Generovanie 30-dňových obsahových plánov a WordPress exporty</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-success-foreground shrink-0" />
                    <span>Slovenská faktúra s odpočtom DPH alebo prenosom daňovej povinnosti</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {!isAuditPass && (
            <div>
              <button
                type="button"
                onClick={() => setShowBilling(!showBilling)}
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
              >
                <ShieldCheck className="size-3.5" />
                {showBilling
                  ? "Skryť firemné fakturačné údaje"
                  : "Zadať firemné údaje (IČO, DIČ pre faktúru)"}
              </button>

              {showBilling && (
                <div className="mt-3 space-y-3 rounded-lg border p-3.5 bg-background">
                  <div>
                    <Label htmlFor="companyName" className="text-xs">
                      Názov firmy / SZČO
                    </Label>
                    <Input
                      id="companyName"
                      placeholder="napr. Moja Firma s.r.o."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="ico" className="text-xs">
                        IČO
                      </Label>
                      <Input
                        id="ico"
                        placeholder="8 číslic (napr. 35763469)"
                        value={ico}
                        onChange={(e) => setIco(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dic" className="text-xs">
                        DIČ
                      </Label>
                      <Input
                        id="dic"
                        placeholder="10 číslic (napr. 2020273893)"
                        value={dic}
                        onChange={(e) => setDic(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="icDph" className="text-xs">
                      IČ DPH (nepovinné, pre platcov)
                    </Label>
                    <Input
                      id="icDph"
                      placeholder="SK2020273893"
                      value={icDph}
                      onChange={(e) => setIcDph(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {isAuditPass ? (
            <Button
              asChild
              className="w-full gap-2 font-semibold shadow-sm bg-primary text-primary-foreground"
            >
              <a href={AUDIT_PASS_CHECKOUT_URL} target="_blank" rel="noopener noreferrer">
                <Zap className="size-4" />
                <span>Objednať Fast-Track Audit Pass (99 €)</span>
                <ExternalLink className="size-3.5 ml-1 opacity-70" />
              </a>
            </Button>
          ) : (
            <>
              <Button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full gap-2 font-semibold shadow-sm"
              >
                {loading ? (
                  <span>Pripravujem bezpečnú platbu...</span>
                ) : (
                  <>
                    <Zap className="size-4" />
                    <span>{isAgency ? `${TRIAL_CTA} — Agency` : `${TRIAL_CTA} — Pro`}</span>
                  </>
                )}
              </Button>
              {selectedPlan === "pro" && (
                <div className="text-center pt-0.5">
                  <a
                    href={PRO_DIRECT_CHECKOUT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors underline inline-flex items-center gap-1"
                  >
                    <span>Alebo zaplatiť priamo cez Stripe odkaz</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="size-3" />
            <span>Zabezpečená platba kartou cez Stripe. Možnosť kedykoľvek zrušiť na 1 klik.</span>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Konečnú sumu a prípadnú daň si skontrolujete v Stripe pred zaplatením.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
