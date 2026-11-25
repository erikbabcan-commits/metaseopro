import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/AppHeader";
import { CmsDeployDialog } from "@/components/CmsDeployDialog";
import { useAuth } from "@/hooks/use-auth";
import { listOutputs, getOutput, deleteOutput } from "@/lib/outputs.functions";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "História výstupov & Archív — SEO4WEB" },
      {
        name: "description",
        content:
          "Prehľad všetkých SEO auditov, vygenerovaných AI článkov, briefov a obsahových plánov s okamžitým exportom a nasadením.",
      },
      { property: "og:title", content: "História výstupov & Archív — SEO4WEB" },
      {
        property: "og:description",
        content: "Tvoje vygenerované články, audity, plány a briefy na jednom mieste.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

type OutputType = "article" | "audit" | "plan" | "brief" | "raketa" | "decay";
type FilterType = "all" | OutputType;
type PeriodFilter = "all" | "7d" | "30d";

type Item = {
  id: string;
  type: OutputType;
  title: string | null;
  created_at: string;
};

type FullItem = Item & {
  output_markdown: string;
  input: unknown;
};

const TYPE_LABEL: Record<OutputType, string> = {
  article: "Článok",
  audit: "SEO Audit",
  plan: "Content Plan",
  brief: "SEO Brief",
  raketa: "SEO Raketa",
  decay: "Decay Radar",
};

const TYPE_ICON: Record<OutputType, string> = {
  article: "article",
  audit: "analytics",
  plan: "calendar_month",
  brief: "neurology",
  raketa: "rocket_launch",
  decay: "trending_down",
};

const TYPE_BADGE_CLASS: Record<OutputType, string> = {
  article: "bg-primary-fixed/50 text-primary",
  audit: "bg-secondary-fixed/50 text-google-green",
  plan: "bg-tertiary-fixed/60 text-on-tertiary-fixed",
  brief: "bg-primary-fixed/40 text-primary",
  raketa: "bg-google-blue-bright/15 text-google-blue-bright",
  decay: "bg-error-container/60 text-google-red",
};

const PAGE_SIZE = 10;

function formatDateSk(iso: string) {
  return new Date(iso).toLocaleString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const list = useServerFn(listOutputs);
  const getOne = useServerFn(getOutput);
  const del = useServerFn(deleteOutput);

  const [items, setItems] = useState<Item[] | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [page, setPage] = useState(1);

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [selected, setSelected] = useState<FullItem | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deployOpen, setDeployOpen] = useState(false);

  const refresh = useCallback(() => {
    list({})
      .then((r) => setItems(r.items as Item[]))
      .catch((e) => toast.error((e as Error).message));
  }, [list]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { redirect: "/history" } });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const openItem = async (id: string, openMobile = true) => {
    setLoadingDetail(true);
    if (openMobile) setMobileDrawerOpen(true);
    try {
      const row = await getOne({ data: { id } });
      setSelected(row as FullItem);
    } catch (e) {
      toast.error((e as Error).message);
      setMobileDrawerOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const removeItem = async (id: string) => {
    if (!confirm("Naozaj zmazať tento záznam z histórie?")) return;
    try {
      await del({ data: { id } });
      toast.success("Záznam bol zmazaný.");
      setItems((cur) => cur?.filter((i) => i.id !== id) ?? null);
      if (selected?.id === id) {
        setSelected(null);
        setMobileDrawerOpen(false);
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const copySelected = async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.output_markdown);
    setCopiedId(selected.id);
    toast.success("Výstup skopírovaný do schránky.");
    setTimeout(() => setCopiedId((cur) => (cur === selected.id ? null : cur)), 1600);
  };

  const downloadSelected = () => {
    if (!selected) return;
    const blob = new Blob([selected.output_markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo4web-${selected.type}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown súbor bol stiahnutý.");
  };

  const counts = useMemo(() => {
    const listItems = items ?? [];
    const byType: Record<OutputType, number> = {
      article: 0,
      audit: 0,
      plan: 0,
      brief: 0,
      raketa: 0,
      decay: 0,
    };
    for (const it of listItems) {
      byType[it.type] = (byType[it.type] ?? 0) + 1;
    }
    return {
      total: listItems.length,
      raketaAndArticles: byType.raketa + byType.article,
      auditsAndDecay: byType.audit + byType.decay,
      plansAndBriefs: byType.plan + byType.brief,
      byType,
    };
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();
    const cutoffMs =
      period === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : period === "30d"
          ? 30 * 24 * 60 * 60 * 1000
          : null;

    return items.filter((item) => {
      if (filter !== "all" && item.type !== filter) return false;
      if (cutoffMs !== null) {
        const createdMs = Date.parse(item.created_at);
        if (Number.isFinite(createdMs) && now - createdMs > cutoffMs) return false;
      }
      if (q) {
        const titleMatch = (item.title ?? "").toLowerCase().includes(q);
        const typeMatch = TYPE_LABEL[item.type].toLowerCase().includes(q);
        if (!titleMatch && !typeMatch) return false;
      }
      return true;
    });
  }, [items, filter, period, searchQuery]);

  const totalPages = filtered ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : 1;
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    if (!filtered) return null;
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const exportIndexMarkdown = () => {
    if (!filtered || filtered.length === 0) {
      toast.error("Nie sú žiadne záznamy na export.");
      return;
    }
    const lines = [
      "# História vygenerovaných výstupov — SEO4WEB",
      "",
      `Exportované: ${new Date().toLocaleString("sk-SK")}`,
      `Počet záznamov: ${filtered.length}`,
      "",
      "| Názov | Typ | Dátum |",
      "|---|---|---|",
      ...filtered.map(
        (i) =>
          `| ${(i.title || "(bez názvu)").replace(/\|/g, "\\|")} | ${TYPE_LABEL[i.type]} | ${formatDateSk(i.created_at)} |`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo4web-historia-zoznam-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Prehľad histórie exportovaný do .md");
  };

  if (loading || !user) {
    return (
      <div className="min-h-[100dvh] bg-surface flex items-center justify-center text-sm text-on-surface-variant font-sans">
        Načítavam Históriu výstupov…
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-surface font-sans text-on-surface flex flex-col pb-safe pt-safe">
      <Toaster />
      <AppHeader />

      <main className="flex-1 w-full pt-16 pb-28 md:pb-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8 space-y-5">
          {/* 1. Top Headline & Action Zone */}
          <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold bg-surface-container-high text-on-surface-variant">
                  Archív &amp; Verzie
                </span>
                <span className="text-on-surface-variant">•</span>
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-google-green inline-block animate-pulse" />
                  <span>Synchronizované s databázou</span>
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-on-surface">
                História vygenerovaných výstupov &amp; Archív
              </h1>
              <p className="text-xs md:text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                Prehľad všetkých SEO auditov, vygenerovaných AI článkov, briefov a obsahových plánov
                s možnosťou okamžitého náhľadu, exportu a nasadenia do CMS.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={exportIndexMarkdown}
                className="inline-flex items-center gap-1.5 bg-surface-pure hover:bg-surface-container-low text-on-surface text-xs font-semibold px-4 py-2.5 rounded-full border border-border-subtle shadow-xs transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                  folder_zip
                </span>
                <span>Exportovať zoznam (.md)</span>
              </button>

              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => setCreateMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 bg-primary-container hover:bg-primary text-on-primary-container text-xs font-semibold px-4 py-2.5 rounded-full shadow-xs transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  <span>Vytvoriť nový výstup</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
                </button>

                {createMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-surface-pure rounded-2xl border border-border-subtle shadow-lg z-30 py-1.5"
                    onMouseLeave={() => setCreateMenuOpen(false)}
                  >
                    <Link
                      to="/raketa"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                    >
                      <span className="material-symbols-outlined text-google-blue-bright text-[18px]">
                        rocket_launch
                      </span>
                      <span>Nová SEO Raketa</span>
                    </Link>
                    <Link
                      to="/brief"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                    >
                      <span className="material-symbols-outlined text-primary text-[18px]">
                        neurology
                      </span>
                      <span>Nový AI Brief</span>
                    </Link>
                    <Link
                      to="/plan"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                    >
                      <span className="material-symbols-outlined text-google-yellow text-[18px]">
                        calendar_month
                      </span>
                      <span>30-dňový Obsahový Plán</span>
                    </Link>
                    <Link
                      to="/audit"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                    >
                      <span className="material-symbols-outlined text-google-green text-[18px]">
                        analytics
                      </span>
                      <span>Nový SEO Audit</span>
                    </Link>
                    <Link
                      to="/decay"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                    >
                      <span className="material-symbols-outlined text-google-red text-[18px]">
                        trending_down
                      </span>
                      <span>Content Decay Radar</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 2. 4 Compact Summary KPI Stat Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Celkom záznamov
                </span>
                <span className="material-symbols-outlined text-[18px] text-primary">
                  inventory_2
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-on-surface">{counts.total}</span>
                <span className="text-[11px] text-google-green font-medium">uložených</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Raketa &amp; Články
                </span>
                <span className="material-symbols-outlined text-[18px] text-google-blue-bright">
                  rocket_launch
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-on-surface">
                  {counts.raketaAndArticles}
                </span>
                <span className="text-[11px] text-on-surface-variant">výstupov</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Audity &amp; Decay
                </span>
                <span className="material-symbols-outlined text-[18px] text-google-green">
                  analytics
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-on-surface">{counts.auditsAndDecay}</span>
                <span className="text-[11px] text-on-surface-variant">analýz</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Plány &amp; Briefy
                </span>
                <span className="material-symbols-outlined text-[18px] text-google-yellow">
                  neurology
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-on-surface">{counts.plansAndBriefs}</span>
                <span className="text-[11px] text-on-surface-variant">dokumentov</span>
              </div>
            </div>
          </section>

          {/* 3. Filter & Search Toolbar */}
          <section className="p-3.5 md:p-4 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Hľadať podľa názvu článku, auditu alebo typu…"
                  className="w-full pl-9 pr-3 py-2 rounded-full bg-surface-container-low border border-border-default text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Period & View Switcher */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value as PeriodFilter);
                    setPage(1);
                  }}
                  aria-label="Filter obdobia"
                  className="px-3 py-2 rounded-full bg-surface-container-low border border-border-default text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="all">Celé obdobie</option>
                  <option value="7d">Posledných 7 dní</option>
                  <option value="30d">Posledných 30 dní</option>
                </select>

                <div className="hidden md:flex items-center p-0.5 rounded-full bg-surface-container text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`px-3 py-1.5 rounded-full font-medium flex items-center gap-1 transition-all ${
                      viewMode === "table"
                        ? "bg-surface-pure text-on-surface shadow-xs font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">table_rows</span>
                    <span>Tabuľka</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={`px-3 py-1.5 rounded-full font-medium flex items-center gap-1 transition-all ${
                      viewMode === "cards"
                        ? "bg-surface-pure text-on-surface shadow-xs font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">grid_view</span>
                    <span>Karty</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {(
                ["all", "raketa", "decay", "article", "audit", "plan", "brief"] as FilterType[]
              ).map((f) => {
                const active = filter === f;
                const count = f === "all" ? counts.total : counts.byType[f];
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setFilter(f);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 border transition-all ${
                      active
                        ? "bg-primary-container text-on-primary-container border-primary-container font-semibold shadow-xs"
                        : "bg-surface-container-low text-on-surface-variant border-border-subtle hover:text-on-surface"
                    }`}
                  >
                    <span>{f === "all" ? "Všetko" : TYPE_LABEL[f]}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        active
                          ? "bg-surface-pure/20 text-on-primary-container"
                          : "bg-surface-container text-on-surface"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 4. Main Workspace Layout (Two-column on desktop: 8 cols list + 4 cols preview) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* LEFT PANEL (8 cols) */}
            <div className="lg:col-span-8 space-y-3">
              {paginated === null ? (
                <div className="space-y-2.5">
                  {[1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className="h-16 animate-pulse rounded-2xl bg-surface-pure border border-border-subtle"
                    />
                  ))}
                </div>
              ) : paginated.length === 0 ? (
                <div className="p-10 rounded-2xl bg-surface-pure border border-border-subtle text-center space-y-3">
                  <span className="material-symbols-outlined text-[36px] text-on-surface-variant/40 block">
                    history_toggle_off
                  </span>
                  <p className="text-sm font-medium text-on-surface">
                    {items?.length === 0
                      ? "Zatiaľ nemáš žiadne vygenerované výstupy."
                      : "Pre zadaný filter sa nenašli žiadne záznamy."}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Vyskúšaj SEO Raketu, AI Brief alebo 30-dňový obsahový plán.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  {viewMode === "table" && (
                    <div className="hidden md:block rounded-2xl bg-surface-pure border border-border-subtle shadow-xs overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-surface-container-low border-b border-border-subtle text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                            <th className="py-3 px-4">Názov výstupu</th>
                            <th className="py-3 px-3">Typ</th>
                            <th className="py-3 px-3">Vytvorené</th>
                            <th className="py-3 px-4 text-right">Akcie</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {paginated.map((item) => {
                            const isSelected = selected?.id === item.id;
                            return (
                              <tr
                                key={item.id}
                                onClick={() => openItem(item.id, false)}
                                className={`cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-primary-fixed/20"
                                    : "hover:bg-surface-container-low/60"
                                }`}
                              >
                                <td className="py-3 px-4 max-w-[300px]">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0 text-on-surface-variant">
                                      <span className="material-symbols-outlined text-[17px]">
                                        {TYPE_ICON[item.type]}
                                      </span>
                                    </div>
                                    <span className="font-semibold text-on-surface truncate">
                                      {item.title || "(bez názvu)"}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${TYPE_BADGE_CLASS[item.type]}`}
                                  >
                                    {TYPE_LABEL[item.type]}
                                  </span>
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap text-on-surface-variant">
                                  {formatDateSk(item.created_at)}
                                </td>
                                <td
                                  className="py-3 px-4 text-right whitespace-nowrap"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    aria-label="Zmazať"
                                    className="p-1.5 rounded-lg text-on-surface-variant hover:bg-error-container/50 hover:text-google-red transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[17px]">
                                      delete
                                    </span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Mobile Compact Cards (Always on mobile, or on desktop when viewMode === 'cards') */}
                  <div className={viewMode === "table" ? "md:hidden space-y-2.5" : "space-y-2.5"}>
                    {paginated.map((item) => {
                      const isSelected = selected?.id === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => openItem(item.id, true)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-primary-fixed/20 border-primary-container shadow-xs"
                              : "bg-surface-pure border-border-subtle shadow-xs hover:bg-surface-container-low/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0 text-primary">
                              <span className="material-symbols-outlined text-[18px]">
                                {TYPE_ICON[item.type]}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-on-surface truncate">
                                {item.title || "(bez názvu)"}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span
                                  className={`px-2 py-0.2 rounded-full text-[10px] font-semibold ${TYPE_BADGE_CLASS[item.type]}`}
                                >
                                  {TYPE_LABEL[item.type]}
                                </span>
                                <span className="text-[11px] text-on-surface-variant">
                                  {formatDateSk(item.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(item.id);
                            }}
                            aria-label="Zmazať"
                            className="p-2 rounded-xl text-on-surface-variant hover:bg-error-container/50 hover:text-google-red transition-colors shrink-0"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Bar */}
                  {filtered && filtered.length > PAGE_SIZE && (
                    <div className="p-3 rounded-2xl bg-surface-pure border border-border-subtle flex items-center justify-between text-xs">
                      <span className="text-on-surface-variant">
                        Strana <strong className="text-on-surface">{safePage}</strong> z{" "}
                        {totalPages} ({filtered.length} záznamov)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={safePage <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="px-3 py-1 rounded-full bg-surface-container-low border border-border-subtle font-medium disabled:opacity-40"
                        >
                          Predošlá
                        </button>
                        <button
                          type="button"
                          disabled={safePage >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className="px-3 py-1 rounded-full bg-surface-container-low border border-border-subtle font-medium disabled:opacity-40"
                        >
                          Ďalšia
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* RIGHT PANEL (4 cols on desktop) - Rýchly Náhľad & Export */}
            <aside className="hidden lg:block lg:col-span-4 sticky top-20 p-5 rounded-2xl bg-surface-pure border border-border-subtle shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    preview
                  </span>
                  <h2 className="text-sm font-bold text-on-surface">Rýchly Náhľad &amp; Export</h2>
                </div>
                {selected && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TYPE_BADGE_CLASS[selected.type]}`}
                  >
                    {TYPE_LABEL[selected.type]}
                  </span>
                )}
              </div>

              {loadingDetail ? (
                <div className="space-y-3 py-6 animate-pulse">
                  <div className="h-4 w-3/4 rounded bg-surface-container" />
                  <div className="h-3 w-full rounded bg-surface-container" />
                  <div className="h-3 w-5/6 rounded bg-surface-container" />
                </div>
              ) : selected ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-on-surface leading-snug">
                      {selected.title || "(bez názvu)"}
                    </h3>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      Vytvorené: {formatDateSk(selected.created_at)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={copySelected}
                      className="py-2 px-3 rounded-full bg-surface-container-low border border-border-subtle text-xs font-semibold text-on-surface hover:bg-surface-container flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedId === selected.id ? "check" : "content_copy"}
                      </span>
                      <span>{copiedId === selected.id ? "Skopírované" : "Kopírovať"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={downloadSelected}
                      className="py-2 px-3 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold hover:bg-primary flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[15px]">download</span>
                      <span>Stiahnuť .md</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeployOpen(true)}
                    className="w-full py-2.5 px-4 rounded-full bg-google-green text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:opacity-95 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                    <span>Nasadiť do CMS (WordPress / Shoptet)</span>
                  </button>

                  {/* Markdown Preview */}
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle max-h-[380px] overflow-y-auto text-xs leading-relaxed">
                    <article className="prose prose-xs max-w-none text-on-surface">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selected.output_markdown}
                      </ReactMarkdown>
                    </article>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center space-y-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[32px] text-on-surface-variant/40 block">
                    touch_app
                  </span>
                  <p className="font-medium text-on-surface">Vyber záznam zo zoznamu</p>
                  <p>
                    Tu sa zobrazí kompletný náhľad a možnosti okamžitého exportu alebo publikácie.
                  </p>
                </div>
              )}
            </aside>
          </section>
        </div>
      </main>

      {/* Mobile 100dvh Slide-Over Drawer for Detail Preview */}
      {mobileDrawerOpen && (selected || loadingDetail) && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-on-surface/40 backdrop-blur-xs flex justify-end"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-full max-w-lg h-[100dvh] bg-surface-pure flex flex-col shadow-2xl pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3.5 border-b border-border-subtle flex items-center justify-between gap-2 bg-surface-pure/95 backdrop-blur-md">
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-primary block">
                  {selected ? TYPE_LABEL[selected.type] : "Načítavam…"}
                </span>
                <h2 className="text-sm font-bold text-on-surface truncate">
                  {selected?.title || "Načítavam detail…"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Zavrieť"
                className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {selected ? (
                <article className="prose prose-sm max-w-none text-on-surface">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selected.output_markdown}
                  </ReactMarkdown>
                </article>
              ) : (
                <div className="space-y-3 animate-pulse py-6">
                  <div className="h-4 w-2/3 rounded bg-surface-container" />
                  <div className="h-3 w-full rounded bg-surface-container" />
                  <div className="h-3 w-5/6 rounded bg-surface-container" />
                </div>
              )}
            </div>

            {selected && (
              <div className="p-4 border-t border-border-subtle bg-surface-pure flex items-center gap-2">
                <button
                  type="button"
                  onClick={copySelected}
                  className="flex-1 py-2.5 px-3 rounded-full bg-surface-container-low border border-border-subtle text-xs font-semibold text-on-surface flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>Kopírovať</span>
                </button>
                <button
                  type="button"
                  onClick={downloadSelected}
                  className="flex-1 py-2.5 px-3 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>.md</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeployOpen(true)}
                  className="py-2.5 px-4 rounded-full bg-google-green text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                  <span>CMS</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <CmsDeployDialog
        open={deployOpen}
        onOpenChange={setDeployOpen}
        initialContent={selected?.output_markdown || ""}
        initialTitle={selected?.title || "SEO4WEB Výstup"}
      />
    </div>
  );
}
