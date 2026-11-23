/**
 * SEO-03 demo: click-loss ranking, "what to fix first" brief and the
 * downloadable client report (CSV, formula-injection safe).
 * Rules follow the UX spec SEO03-SPEC.md §3 (brief) and §6.4 (escaping).
 */
import type { PageComparison, ParsedExport } from "./gsc-export";

export type HintKind =
  "missing" | "title_meta" | "content" | "content_and_title" | "demand" | "manual";

export type FixHint = { kind: HintKind; title: string; detail: string };

export type PageLoss = PageComparison & {
  rank: number;
  /** previous - current (A - B), always > 0 for listed pages. */
  clickLoss: number;
  /** Loss as a fraction of period A (0..1); null when A is 0. */
  lossPct: number | null;
  hint: FixHint;
};

export type LossSummary = {
  top: PageLoss[];
  pagesTotal: number;
  pagesWithLoss: number;
  /** Sum of the click loss of the listed (top) pages. */
  topClickLoss: number;
};

/** Thresholds used by the brief; exported so tests and UI copy agree. */
export const HINT_THRESHOLDS = {
  stablePosition: 1, // |Δ position| below this = stable
  positionDrop: 2, // content / cannibalization
  ctrRelativeDrop: 0.15, // 15 % relative
  impressionsDrop: 0.2, // 20 %
} as const;

/** Labelled assumption for the time saving: manual report ≈ 45 min, demo ≈ 90 s. */
export const TIME_ASSUMPTION = { manualMinutes: 45, demoSeconds: 90 } as const;
export const TIME_SAVED_MINUTES = TIME_ASSUMPTION.manualMinutes - TIME_ASSUMPTION.demoSeconds / 60;

const fmt1 = (n: number) => n.toFixed(1).replace(".", ",");
const fmtPct2 = (fraction: number) => `${(fraction * 100).toFixed(2).replace(".", ",")} %`;

function pathOf(page: string): string {
  try {
    return new URL(page).pathname;
  } catch {
    return page;
  }
}

/** A page new in period B that may have taken over the traffic (same first path segment preferred). */
function successorCandidate(page: string, rows: PageComparison[]): string | null {
  const segment = pathOf(page).split("/")[1] ?? "";
  const fresh = rows.filter(
    (r) => r.previous.clicks === 0 && r.current.clicks > 0 && r.page !== page,
  );
  fresh.sort((a, b) => {
    const sa = (pathOf(a.page).split("/")[1] ?? "") === segment ? 1 : 0;
    const sb = (pathOf(b.page).split("/")[1] ?? "") === segment ? 1 : 0;
    return sb - sa || b.current.clicks - a.current.clicks;
  });
  return fresh[0] ? pathOf(fresh[0].page) : null;
}

export function buildHint(row: PageComparison, allRows: PageComparison[] = []): FixHint {
  const { current: cur, previous: prev } = row;
  const posChange =
    cur.position !== null && prev.position !== null ? cur.position - prev.position : null;
  const ctrRel =
    cur.ctr !== null && prev.ctr !== null && prev.ctr > 0 ? (cur.ctr - prev.ctr) / prev.ctr : null;
  const imprChange =
    cur.impressions !== null && prev.impressions !== null && prev.impressions > 0
      ? (cur.impressions - prev.impressions) / prev.impressions
      : null;
  const positionStable = posChange !== null && Math.abs(posChange) < HINT_THRESHOLDS.stablePosition;
  const ctrDropped = ctrRel !== null && ctrRel <= -HINT_THRESHOLDS.ctrRelativeDrop;
  const ctrStable = ctrRel !== null && Math.abs(ctrRel) < HINT_THRESHOLDS.ctrRelativeDrop;

  const missingInB =
    prev.clicks > 0 && cur.clicks === 0 && (row.missingIn === "current" || cur.impressions === 0);
  if (missingInB) {
    const successor = successorCandidate(row.page, allRows);
    return {
      kind: "missing",
      title: "Indexácia alebo nový URL",
      detail:
        "V období B stránka v exporte nie je (0 klikov). Overte, či je stále indexovaná a či návštevnosť neprebral nový URL" +
        (successor ? `, napr. ${successor}.` : "."),
    };
  }
  if (positionStable && ctrDropped) {
    return {
      kind: "title_meta",
      title: "Title a meta description",
      detail: `CTR klesol pri takmer rovnakej pozícii (${fmt1(prev.position!)} → ${fmt1(cur.position!)}). Ako prvé prepíšte title a meta description — úryvok vo vyhľadávaní už zrejme neoslovuje.`,
    };
  }
  if (
    posChange !== null &&
    posChange >= HINT_THRESHOLDS.positionDrop &&
    (ctrStable || ctrRel === null)
  ) {
    return {
      kind: "content",
      title: "Obsah a kanibalizácia",
      detail: `Priemerná pozícia spadla z ${fmt1(prev.position!)} na ${fmt1(cur.position!)}${ctrStable ? ", CTR ostal podobný" : ""}. Skontrolujte obsah a to, či stránku neprebíja iná kategória alebo produkt (kanibalizácia).`,
    };
  }
  if (posChange !== null && posChange >= HINT_THRESHOLDS.stablePosition && ctrDropped) {
    return {
      kind: "content_and_title",
      title: "Obsah aj title",
      detail: `Klesla pozícia (${fmt1(prev.position!)} → ${fmt1(cur.position!)}) aj CTR (${fmtPct2(prev.ctr!)} → ${fmtPct2(cur.ctr!)}). Obnovte obsah aj title a meta description.`,
    };
  }
  if (
    imprChange !== null &&
    imprChange <= -HINT_THRESHOLDS.impressionsDrop &&
    positionStable &&
    ctrStable
  ) {
    return {
      kind: "demand",
      title: "Dopyt alebo sezónnosť",
      detail: `Zobrazenia klesli o ${Math.round(-imprChange * 100)} %, pozícia aj CTR sú stabilné. Skôr ide o dopyt alebo sezónnosť než o chybu stránky.`,
    };
  }
  return {
    kind: "manual",
    title: "Manuálna kontrola",
    detail:
      "Z metrík nevyplýva jednoznačná príčina. Pozrite dopyty stránky v Search Console a porovnajte výsledky vyhľadávania.",
  };
}

/** Ranks by absolute click loss (A − B), then higher % loss, then higher A clicks. */
export function computeLosses(data: Pick<ParsedExport, "rows">, limit = 3): LossSummary {
  const withLoss = data.rows
    .map((row) => {
      const loss = row.previous.clicks - row.current.clicks;
      const pct = row.previous.clicks > 0 ? loss / row.previous.clicks : null;
      return { row, loss, pct };
    })
    .filter((x) => x.loss > 0);
  withLoss.sort(
    (a, b) =>
      b.loss - a.loss ||
      (b.pct ?? 0) - (a.pct ?? 0) ||
      b.row.previous.clicks - a.row.previous.clicks ||
      a.row.page.localeCompare(b.row.page),
  );
  const top = withLoss.slice(0, limit).map(({ row, loss, pct }, i): PageLoss => ({
    ...row,
    rank: i + 1,
    clickLoss: loss,
    lossPct: pct,
    hint: buildHint(row, data.rows),
  }));
  return {
    top,
    pagesTotal: data.rows.length,
    pagesWithLoss: withLoss.length,
    topClickLoss: top.reduce((s, p) => s + p.clickLoss, 0),
  };
}

/**
 * Invisible characters a spreadsheet may skip before reading a formula:
 * zero-width (U+200B–U+200F), bidi embeddings/overrides (U+202A–U+202E),
 * bidi isolates (U+2066–U+2069) and the BOM / zero-width no-break space.
 */
const LEADING_INVISIBLE = /^[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]+/;

/** = + - @ TAB CR, plus their fullwidth forms ＝ ＋ － ＠ (U+FF1D, FF0B, FF0D, FF20). */
const FORMULA_START = /^[=+\-@\t\r\uFF1D\uFF0B\uFF0D\uFF20]/;

/**
 * Neutralizes spreadsheet formula injection (OWASP CSV injection) in TEXT
 * cells: anything that starts with a formula character, after skipping leading
 * invisible characters, gets a leading apostrophe. The value is kept as is.
 */
export function sanitizeCell(value: string): string {
  return FORMULA_START.test(value.replace(LEADING_INVISIBLE, "")) ? `'${value}` : value;
}

type ReportCell = { text: string } | { num: number | null; digits?: number };

const text = (value: string): ReportCell => ({ text: value });
const num = (value: number | null, digits = 0): ReportCell => ({ num: value, digits });

function renderCell(cell: ReportCell, delimiter: string): string {
  let out: string;
  if ("text" in cell) {
    out = sanitizeCell(cell.text);
  } else if (cell.num === null || !Number.isFinite(cell.num)) {
    out = "";
  } else {
    // Numbers are written as plain numerals (decimal comma for SK Excel), so a
    // negative value like -860 stays a number and is not escaped as text.
    const digits = cell.digits ?? 0;
    out = (digits === 0 ? String(Math.round(cell.num)) : cell.num.toFixed(digits)).replace(
      ".",
      ",",
    );
  }
  return /["\n\r]/.test(out) || out.includes(delimiter) ? `"${out.replace(/"/g, '""')}"` : out;
}

export const REPORT_HEADERS = [
  "Poradie",
  "Stránka",
  "Kliky A",
  "Kliky B",
  "Zmena klikov",
  "Zmena %",
  "Impresie A",
  "Impresie B",
  "CTR % A",
  "CTR % B",
  "Pozícia A",
  "Pozícia B",
  "Čo opraviť ako prvé",
] as const;

/**
 * Client report CSV: semicolon-delimited with a BOM so Slovak Excel opens it
 * directly. Text cells go through `sanitizeCell`; numeric cells are numerals.
 */
export function buildReportCsv(summary: LossSummary): string {
  const d = ";";
  const lines = [REPORT_HEADERS.map((h) => renderCell(text(h), d)).join(d)];
  for (const p of summary.top) {
    const cells: ReportCell[] = [
      num(p.rank),
      text(p.page),
      num(p.previous.clicks),
      num(p.current.clicks),
      num(-p.clickLoss),
      num(p.lossPct === null ? null : -p.lossPct * 100, 1),
      num(p.previous.impressions),
      num(p.current.impressions),
      num(p.previous.ctr === null ? null : p.previous.ctr * 100, 2),
      num(p.current.ctr === null ? null : p.current.ctr * 100, 2),
      num(p.previous.position, 1),
      num(p.current.position, 1),
      text(`${p.hint.title}: ${p.hint.detail}`),
    ];
    lines.push(cells.map((c) => renderCell(c, d)).join(d));
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
