import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { crawlSiteFn } from "@/lib/crawler.functions";
import type { PageAudit } from "@/lib/crawler.server";

type Inspection =
  | { status: "loading" }
  | { status: "error"; url: string; message: string }
  | { status: "done"; page: PageAudit };

export function QuickUrlInspection() {
  const inspect = useServerFn(crawlSiteFn);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const loading = inspection?.status === "loading";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const url = String(new FormData(event.currentTarget).get("url") ?? "").trim();
    if (!url) {
      setInspection({ status: "error", url, message: "Zadajte URL podstránky." });
      return;
    }

    setInspection({ status: "loading" });
    try {
      const result = await inspect({ data: { url, singlePage: true } });
      const page = result.pages[0];
      if (!page) {
        const reason = result.findings.find((finding) => finding.severity === "critical");
        const message = result.stepStates.includes("TIMEOUT")
          ? "Čas na načítanie stránky vypršal."
          : (reason?.message ?? result.findings[0]?.message ?? "Stránku sa nepodarilo načítať.");
        setInspection({ status: "error", url, message });
        return;
      }

      if (page.error || page.status < 200 || page.status >= 300) {
        const message =
          page.error ||
          (page.status ? `Stránka vrátila HTTP ${page.status}.` : "Stránku sa nepodarilo načítať.");
        setInspection({ status: "error", url, message });
        return;
      }
      setInspection({ status: "done", page });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setInspection({
        status: "error",
        url,
        message: /unauthorized|unauthenticated/i.test(message)
          ? "Platnosť prihlásenia vypršala. Prihláste sa znova."
          : message || "Server inšpekcie neodpovedal. Skúste to znova.",
      });
    }
  }

  const page = inspection?.status === "done" ? inspection.page : null;

  return (
    <section
      aria-labelledby="quick-inspection-heading"
      className="p-4 rounded-xl bg-surface-pure border border-border-subtle shadow-xs flex flex-col gap-3"
    >
      <h2
        id="quick-inspection-heading"
        className="flex items-center gap-2 text-[16px] leading-[22px] font-semibold text-text-primary"
      >
        <Search aria-hidden="true" className="size-4 text-primary" />
        Rýchla URL inšpekcia
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex min-w-0 flex-1 items-center">
          <Link2
            aria-hidden="true"
            className="size-4 absolute left-3.5 text-text-secondary pointer-events-none"
          />
          <input
            name="url"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={2048}
            readOnly={loading}
            placeholder="napr. mojeshop.sk/novy-produkt"
            aria-label="URL podstránky na inšpekciu"
            className="w-full h-11 pl-10 pr-3 rounded-full bg-surface-container-low text-[13px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface-pure border border-transparent focus:border-primary shadow-xs"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-11 px-5 rounded-full bg-primary-container text-on-primary-container text-[12px] font-semibold shadow-xs hover:bg-primary"
        >
          {loading ? (
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <Search aria-hidden="true" className="size-4" />
          )}
          {loading ? "Analyzujem podstránku…" : "Analyzovať podstránku"}
        </Button>
      </form>
      {inspection?.status === "error" && (
        <p role="alert" className="break-words text-sm text-destructive">
          {inspection.message} {inspection.url}
        </p>
      )}
      <div aria-live="polite" aria-busy={loading}>
        {page && (
          <dl className="grid gap-2 text-sm">
            {[
              ["Analyzovaná URL", page.url],
              ["Titulok", page.title],
              ["Meta description", page.description],
              ["Canonical", page.canonical],
              ["H1", page.h1.join("\n")],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <dt className="font-semibold text-text-primary">{label}</dt>
                <dd className="whitespace-pre-line break-words text-text-secondary">
                  {value || "Neuvedené"}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
