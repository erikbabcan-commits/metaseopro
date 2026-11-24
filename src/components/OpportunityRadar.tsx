import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Compass, Rocket, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { handoffToWriter } from "@/lib/refresh-handoff";
import type { DecayDataset, ScoredDecayRow } from "@/lib/decay-schema";
import {
  CATEGORY_LABEL,
  PAGE_TYPE_LABEL,
  detectCannibalization,
  experimentVerdict,
  rankOpportunities,
  suggestInternalLinks,
  type OppPage,
} from "@/lib/opportunity";

type Snap = { id: string; site_url: string; created_at: string; raw_data: DecayDataset };
type Experiment = {
  id: string;
  page_url: string;
  implemented_at: string;
  baseline: { clicks: number; impressions: number; position: number };
  target_queries: string[];
  status: string;
};

function toOpp(r: ScoredDecayRow): OppPage {
  return {
    url: r.url,
    clicks: r.clicksNow,
    impressions: r.impressionsNow,
    position: r.positionNow,
    clicksPrev: r.clicksPrev,
    impressionsPrev: r.impressionsPrev,
    positionPrev: r.positionPrev,
    queries: r.topQueries.map((q) => ({
      query: q.query,
      clicks: q.clicksNow,
      impressions: 0,
      position: q.positionNow,
      clicksPrev: q.clicksPrev,
      impressionsPrev: 0,
      positionPrev: q.positionPrev,
    })),
  };
}

export function OpportunityRadar({
  snap,
  userId,
  onDeploy,
}: {
  snap: Snap;
  userId: string;
  onDeploy?: (url: string, markdown?: string, title?: string) => void;
}) {
  const rows = snap.raw_data?.rows;
  const pages = useMemo(() => (rows ?? []).map(toOpp), [rows]);
  const brand = useMemo(() => {
    try {
      return [
        new URL(snap.site_url.replace("sc-domain:", "https://")).hostname
          .replace(/^www\./, "")
          .split(".")[0]!,
      ];
    } catch {
      return [];
    }
  }, [snap.site_url]);
  const ranked = useMemo(() => rankOpportunities(pages, brand), [pages, brand]);
  const cannibal = useMemo(() => detectCannibalization(pages), [pages]);
  const links = useMemo(() => suggestInternalLinks(ranked).slice(0, 6), [ranked]);
  const [exps, setExps] = useState<Experiment[]>([]);
  const [radarFilter, setRadarFilter] = useState<"all" | "wins" | "drops" | "new">("all");

  const filteredRanked = useMemo(() => {
    if (radarFilter === "wins") {
      return ranked.filter((p) => p.state === "Opportunity" || p.position <= 10);
    }
    if (radarFilter === "drops") {
      return ranked.filter((p) => p.state === "Critical" || p.position > p.positionPrev);
    }
    if (radarFilter === "new") {
      return ranked.filter((p) => p.positionPrev === 0 || p.clicks === 0);
    }
    return ranked;
  }, [ranked, radarFilter]);

  const loadExps = useCallback(async () => {
    const { data } = await supabase
      .from("seo_experiments")
      .select("id,page_url,implemented_at,baseline,target_queries,status")
      .eq("site_url", snap.site_url)
      .order("created_at", { ascending: false })
      .limit(30);
    setExps((data ?? []) as unknown as Experiment[]);
  }, [snap.site_url]);
  useEffect(() => {
    void loadExps();
  }, [loadExps]);

  const optimize = (url: string) => {
    const r = rows?.find((x) => x.url === url);
    if (!r) return;
    handoffToWriter(snap.site_url, r);
    window.location.href = "/?fromRefresh=1";
  };

  const track = async (url: string) => {
    const p = ranked.find((x) => x.url === url);
    if (!p) return;
    const { error } = await supabase.from("seo_experiments").insert({
      user_id: userId,
      site_url: snap.site_url,
      page_url: url,
      baseline: { clicks: p.clicks, impressions: p.impressions, position: p.position },
      target_queries: p.queries.slice(0, 5).map((q) => q.query),
      changes: p.action.slice(0, 5000),
      status: "approved",
    });
    if (error) return toast.error("Experiment sa nepodarilo uložiť");
    toast.success("Zmena sa sleduje — porovnáme ju s ďalšími skenmi");
    void loadExps();
  };

  const removeExp = async (id: string) => {
    if (!userId) return;
    await supabase.from("seo_experiments").delete().eq("id", id).eq("user_id", userId);
    void loadExps();
  };

  const stateColor: Record<string, string> = {
    Critical: "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold",
    Opportunity:
      "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold",
    Good: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold",
    Protected: "bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 font-bold",
    "Needs data": "bg-muted border border-border text-muted-foreground font-medium",
  };

  return (
    <section id="radar-list" className="mt-6 flex flex-col gap-3">
      {/* Radar Header */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <Compass className="size-5 text-primary shrink-0" />
            <h2 className="text-[18px] leading-[24px] font-semibold text-text-primary">
              Opportunity Radar
            </h2>
          </div>
          <p className="text-[13px] leading-[18px] text-text-secondary">
            Top príležitosti pre organický rast ·{" "}
            <span className="font-mono text-text-primary font-medium">{snap.site_url}</span>
          </p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-semibold shrink-0">
          {ranked.length} aktívnych
        </span>
      </div>

      {/* Filter Chips (Horizontal Scrollable) */}
      {ranked.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 select-none">
          {(
            [
              { key: "all", label: `Všetky (${ranked.length})` },
              { key: "wins", label: "Rýchle výhry" },
              { key: "drops", label: "Pokles pozícií" },
              { key: "new", label: "Nové trendy" },
            ] as const
          ).map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setRadarFilter(chip.key)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-medium shrink-0 shadow-xs transition-colors ${
                radarFilter === chip.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-pure text-text-secondary hover:text-text-primary"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {ranked.length === 0 ? (
        <p className="mt-2 rounded-xl bg-surface-pure border border-border-subtle p-5 text-sm text-text-secondary shadow-xs">
          Žiadne stránky s dostatkom dát. Spusti nový live sken v Decay Radar.
        </p>
      ) : (
        <>
          {/* Mobile Cards List (< md) */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {filteredRanked.slice(0, 15).map((p) => {
              const path = p.url.replace(/^https?:\/\/[^/]+/, "") || "/";
              const keyword = p.queries[0]?.query || path;
              const posDelta = p.positionPrev > 0 ? p.positionPrev - p.position : 0;
              const isDrop = p.state === "Critical" || posDelta < -0.4;
              const isNew = p.positionPrev === 0;
              const upsideClicks = Math.max(10, Math.round(p.impressions * 0.04));

              return (
                <article
                  key={p.url}
                  className="p-3.5 rounded-xl bg-surface-pure border border-border-subtle shadow-[0_1px_3px_rgba(60,64,67,0.08)] flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <h3 className="text-[15px] leading-[20px] font-semibold text-text-primary truncate">
                        {keyword}
                      </h3>
                      <span className="text-[12px] leading-[16px] text-text-secondary truncate">
                        {path}
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full shrink-0 text-[11px] font-semibold ${
                        isDrop
                          ? "bg-error-container text-on-error-container"
                          : isNew
                            ? "bg-primary-fixed/60 text-primary"
                            : "bg-secondary-fixed/50 text-on-secondary-container"
                      }`}
                    >
                      <span>#{Math.round(p.position)}</span>
                      {isNew ? (
                        <span className="text-[10px] uppercase font-bold ml-0.5">Nové</span>
                      ) : posDelta >= 0 ? (
                        <>
                          <TrendingUp className="size-3 ml-0.5" />
                          <span>+{Math.abs(posDelta).toFixed(0)}</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="size-3 ml-0.5" />
                          <span>-{Math.abs(posDelta).toFixed(0)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Metric Badges Row */}
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-surface-container-low text-[11px]">
                    <div>
                      <span className="text-text-secondary">Impresie: </span>
                      <span className="font-semibold text-text-primary">
                        {new Intl.NumberFormat("sk-SK").format(p.impressions)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Potenciál: </span>
                      <span className="font-semibold text-google-green">
                        +{new Intl.NumberFormat("sk-SK").format(upsideClicks)} klikov
                      </span>
                    </div>
                  </div>

                  {/* AI Recommendation */}
                  <div className="flex items-start gap-1.5 text-[13px] leading-[18px] text-on-surface-variant">
                    <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>{p.action}</span>
                  </div>

                  {/* Primary Action */}
                  <button
                    type="button"
                    onClick={() => optimize(p.url)}
                    className={`w-full h-10 rounded-full text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      isDrop
                        ? "bg-tertiary-fixed hover:bg-tertiary-fixed-dim/70 text-on-tertiary-fixed"
                        : "bg-primary-fixed/50 hover:bg-primary-fixed text-on-primary-fixed"
                    }`}
                  >
                    <Sparkles className="size-4" />
                    <span>{isDrop ? "Spustiť záchranu" : "Optimalizovať cez AI"}</span>
                  </button>
                </article>
              );
            })}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block mt-2 overflow-x-auto rounded-xl bg-surface-pure border border-border-default shadow-xs">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-3.5">URL</th>
                  <th className="p-3.5">Skóre</th>
                  <th className="p-3.5">Impr.</th>
                  <th className="p-3.5">Kliky</th>
                  <th className="p-3.5">Poz.</th>
                  <th className="p-3.5">Zámer / typ</th>
                  <th className="p-3.5">Kategórie</th>
                  <th className="p-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {ranked.slice(0, 20).map((p, pIdx) => (
                  <tr
                    key={`${p.url}-${pIdx}`}
                    className="border-t border-border/60 hover:bg-muted/40 transition-colors align-top"
                  >
                    <td className="p-3.5 max-w-[260px]">
                      <div className="truncate font-semibold text-foreground">{p.path}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{p.action}</div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs ${stateColor[p.state] ?? ""}`}
                      >
                        {p.score}
                      </span>
                    </td>
                    <td className="p-3.5 tabular-nums text-foreground/80">{p.impressions}</td>
                    <td className="p-3.5 tabular-nums text-foreground/80">{p.clicks}</td>
                    <td className="p-3.5 tabular-nums text-foreground/80">
                      {p.position.toFixed(1)}
                    </td>
                    <td className="p-3.5 text-xs text-foreground/80">
                      <span className="font-semibold text-foreground">{p.intent}</span>
                      <br />
                      <span className="text-muted-foreground">{PAGE_TYPE_LABEL[p.pageType]}</span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {p.categories.map((c, cIdx) => (
                          <span
                            key={`${c}-${cIdx}`}
                            className="rounded bg-muted border border-border px-1.5 py-0.5 text-[11px] text-foreground"
                          >
                            {CATEGORY_LABEL[c]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <Button
                        variant="studio"
                        size="studio"
                        onClick={() => optimize(p.url)}
                        className="rounded-md bg-primary hover:bg-primary/90 px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors shadow-xs"
                      >
                        Optimalizovať
                      </Button>
                      <Button
                        variant="studio"
                        size="studio"
                        onClick={() => track(p.url)}
                        className="ml-2 rounded-md border border-border bg-card hover:bg-muted text-foreground px-3 py-1.5 text-xs transition-colors shadow-xs"
                      >
                        Sledovať zmenu
                      </Button>
                      {onDeploy && (
                        <Button
                          variant="studio"
                          size="studio"
                          onClick={() => onDeploy(p.url, "", p.path)}
                          className="ml-2 rounded-md bg-primary hover:bg-primary/90 px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors shadow-xs"
                          title="1-Click nasadenie do WordPressu"
                        >
                          <Rocket className="size-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-card border border-border p-5 shadow-xs">
          <h3 className="font-bold text-sm text-foreground font-display">Riziko kanibalizácie</h3>
          {cannibal.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Nenašli sa stránky súperiace o rovnaký dopyt.
            </p>
          ) : (
            <ul className="mt-2 space-y-2 text-xs text-foreground/80">
              {cannibal.slice(0, 8).map((c, cIdx) => (
                <li key={`${c.query}-${cIdx}`}>
                  <b className="text-primary font-semibold">„{c.query}“</b> →{" "}
                  {c.urls
                    .map((u) => {
                      try {
                        return new URL(u).pathname;
                      } catch {
                        return u;
                      }
                    })
                    .join(" · ")}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl bg-card border border-border p-5 shadow-xs">
          <h3 className="font-bold text-sm text-foreground font-display">
            Návrhy interných odkazov
          </h3>
          {links.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Zatiaľ žiadne návrhy.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-xs text-foreground/80">
              {links.map((l, i) => (
                <li key={`link-${l.source}-${l.target}-${i}`}>
                  <b className="text-foreground">[{l.anchor}]</b>: {l.source} → {l.target}{" "}
                  <span className="text-muted-foreground">
                    ({l.priority}) {l.reason}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-card border border-border p-5 shadow-xs">
        <h3 className="font-bold text-sm text-foreground font-display">
          Sledované zmeny (pred / po)
        </h3>
        {exps.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Klikni na „Sledovať zmenu" po úprave stránky — porovnáme výsledok s ďalšími skenmi.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-3 w-full text-xs">
              <thead className="text-left text-muted-foreground border-b border-border pb-2 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2">Stránka</th>
                  <th>Od</th>
                  <th>Pred</th>
                  <th>Teraz</th>
                  <th>Výsledok</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {exps.map((e, eIdx) => {
                  const now = ranked.find((p) => p.url === e.page_url);
                  const days = Math.floor(
                    (Date.now() - new Date(e.implemented_at).getTime()) / 86400000,
                  );
                  const verdict = now
                    ? experimentVerdict(
                        e.baseline,
                        {
                          clicks: now.clicks,
                          impressions: now.impressions,
                          position: now.position,
                        },
                        days,
                      )
                    : "INSUFFICIENT DATA";
                  return (
                    <tr
                      key={`${e.id}-${eIdx}`}
                      className="border-t border-border/60 hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-2.5 font-medium text-foreground">
                        {(() => {
                          try {
                            return new URL(e.page_url).pathname;
                          } catch {
                            return e.page_url;
                          }
                        })()}
                      </td>
                      <td className="text-muted-foreground">{e.implemented_at}</td>
                      <td className="text-foreground/80">
                        {e.baseline.clicks} kl · {e.baseline.position?.toFixed?.(1)}
                      </td>
                      <td className="text-foreground/80">
                        {now ? `${now.clicks} kl · ${now.position.toFixed(1)}` : "—"}
                      </td>
                      <td
                        className={
                          verdict.startsWith("IMPROVED")
                            ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                            : verdict.startsWith("DECLINED")
                              ? "text-rose-600 dark:text-rose-400 font-semibold"
                              : "text-muted-foreground"
                        }
                      >
                        {verdict}
                      </td>
                      <td className="text-right">
                        <Button
                          variant="studio"
                          size="studio"
                          onClick={() => removeExp(e.id)}
                          className="text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded p-1 transition-colors"
                        >
                          ×
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
