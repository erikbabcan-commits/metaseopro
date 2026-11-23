/**
 * SEO-03 demo: click-loss ranking, "what to fix first" hints and the
 * downloadable client report (CSV, formula-injection safe).
 */
import type { PageComparison, ParsedExport } from "./gsc-export";

export type HintKind = "position" | "ctr" | "demand" | "lost" | "manual";

export type FixHint = { kind: HintKind; title: string; detail: string };

export type PageLoss = PageComparison & {
  rank: number;
  clickLoss: number;
  /** Loss as a fraction of the previous period (0..1), null when previous is 0. */
  lossPct: number | null;
  impressionsChangePct: number | null;
  /** Percentage-point change of CTR (current - previous), e.g. -0.012 = -1.2 pp. */
  ctrChange: number | null;
  /** current - previous; positive means the page ranks worse. */
  positionChange: number | null;
  hints: FixHint[];
};

export type LossSummary = {
  top: PageLoss[];
  pagesTotal: number;
  pagesWithLoss: number;
  totalClickLoss: number;
};

/** Thresholds used for hints; exported so tests and UI copy agree. */
export const HINT_THRESHOLDS = {
  positionDrop: 1, // positions
  ctrRelativeDrop: 0.2, // 20 % relative
  impressionsDrop: 0.2, // 20 %
} as const;

/** Manual GSC reporting estimate, shown in the UI only as a labelled assumption. */
export const TIME_ASSUMPTION = { manualMinutes: 45, demoMinutes: 2 } as const;

const fmt1 = (n: number) => n.toFixed(1).replace(".", ",");
const pct = (n: number) => `${Math.round(n * 100)} %`;

export function buildHints(row: PageComparison): FixHint[] {
  const { current: cur, previous: prev } = row;
  const hints: FixHint[] = [];
  const posChange =
    cur.position !== null && prev.position !== null ? cur.position - prev.position : null;
  const positionStable = posChange === null || Math.abs(posChange) < HINT_THRESHOLDS.positionDrop;
  const imprChange =
    cur.impressions !== null && prev.impressions !== null && prev.impressions > 0
      ? (cur.impressions - prev.impressions) / prev.impressions
      : null;
  const ctrRel =
    cur.ctr !== null && prev.ctr !== null && prev.ctr > 0 ? (cur.ctr - prev.ctr) / prev.ctr : null;

  if (prev.clicks > 0 && cur.clicks === 0 && cur.impressions === 0) {
    hints.push({
      kind: "lost",
      title: "Stránka úplne vypadla z výsledkov",
      detail:
        "Over v Search Console (Kontrola URL), či je stránka indexovaná, nevracia 404/presmerovanie a nemá noindex.",
    });
  }
  if (posChange !== null && posChange >= HINT_THRESHOLDS.positionDrop) {
    hints.push({
      kind: "position",
      title: "Obsah a odkazy",
      detail: `Priemerná pozícia klesla z ${fmt1(prev.position!)} na ${fmt1(cur.position!)}. Aktualizuj obsah podľa toho, čo dnes rankuje, a posilni interné odkazy na stránku.`,
    });
  }
  if (ctrRel !== null && ctrRel <= -HINT_THRESHOLDS.ctrRelativeDrop && positionStable) {
    hints.push({
      kind: "ctr",
      title: "Title a meta description",
      detail: `CTR kleslo z ${fmt1(prev.ctr! * 100)} % na ${fmt1(cur.ctr! * 100)} % pri stabilnej pozícii. Prepíš title a meta description, skontroluj rozšírené výsledky.`,
    });
  }
  if (imprChange !== null && imprChange <= -HINT_THRESHOLDS.impressionsDrop && positionStable) {
    hints.push({
      kind: "demand",
      title: "Dopyt alebo indexácia",
      detail: `Zobrazenia klesli o ${pct(-imprChange)} pri stabilnej pozícii. Over sezónnosť dopytu a indexáciu stránky.`,
    });
  }
  if (hints.length === 0) {
    hints.push({
      kind: "manual",
      title: "Manuálna kontrola",
      detail:
        "Z dát nevyplýva jednoznačná príčina. Pozri dotazy stránky v Search Console a porovnaj SERP.",
    });
  }
  return hints;
}

export function computeLosses(data: Pick<ParsedExport, "rows">, limit = 3): LossSummary {
  const withLoss = data.rows
    .map((row) => ({ row, loss: row.previous.clicks - row.current.clicks }))
    .filter((x) => x.loss > 0);
  withLoss.sort(
    (a, b) =>
      b.loss - a.loss ||
      b.row.previous.clicks - a.row.previous.clicks ||
      a.row.page.localeCompare(b.row.page),
  );
  const top = withLoss.slice(0, limit).map(({ row, loss }, i): PageLoss => {
    const { current: cur, previous: prev } = row;
    return {
      ...row,
      rank: i + 1,
      clickLoss: loss,
      lossPct: prev.clicks > 0 ? loss / prev.clicks : null,
      impressionsChangePct:
        cur.impressions !== null && prev.impressions !== null && prev.impressions > 0
          ? (cur.impressions - prev.impressions) / prev.impressions
          : null,
      ctrChange: cur.ctr !== null && prev.ctr !== null ? cur.ctr - prev.ctr : null,
      positionChange:
        cur.position !== null && prev.position !== null ? cur.position - prev.position : null,
      hints: buildHints(row),
    };
  });
  return {
    top,
    pagesTotal: data.rows.length,
    pagesWithLoss: withLoss.length,
    totalClickLoss: withLoss.reduce((s, x) => s + x.loss, 0),
  };
}

/**
 * Neutralizes spreadsheet formula injection (OWASP CSV injection): any cell
 * starting with = + - @ TAB or CR is prefixed with a single quote.
 */
export function sanitizeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number | null, delimiter: string): string {
  const text = value === null ? "" : String(value);
  const safe = sanitizeCell(text);
  return /["\n\r]/.test(safe) || safe.includes(delimiter) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const num = (n: number | null, digits = 0) =>
  n === null ? null : digits === 0 ? String(Math.round(n)) : n.toFixed(digits).replace(".", ",");

export const REPORT_HEADERS = [
  "Poradie",
  "Stránka",
  "Kliknutia (predchádzajúce)",
  "Kliknutia (aktuálne)",
  "Strata kliknutí",
  "Strata %",
  "Zobrazenia (predchádzajúce)",
  "Zobrazenia (aktuálne)",
  "CTR % (predchádzajúce)",
  "CTR % (aktuálne)",
  "Pozícia (predchádzajúca)",
  "Pozícia (aktuálna)",
  "Čo opraviť ako prvé",
] as const;

/**
 * Builds the client report CSV. Semicolon-delimited with a BOM so Slovak
 * Excel opens it directly. Every cell goes through `sanitizeCell`.
 */
export function buildReportCsv(summary: LossSummary): string {
  const d = ";";
  const lines = [REPORT_HEADERS.map((h) => csvCell(h, d)).join(d)];
  for (const p of summary.top) {
    lines.push(
      [
        String(p.rank),
        p.page,
        num(p.previous.clicks),
        num(p.current.clicks),
        num(p.clickLoss),
        p.lossPct === null ? null : num(p.lossPct * 100, 1),
        num(p.previous.impressions),
        num(p.current.impressions),
        p.previous.ctr === null ? null : num(p.previous.ctr * 100, 2),
        p.current.ctr === null ? null : num(p.current.ctr * 100, 2),
        num(p.previous.position, 1),
        num(p.current.position, 1),
        p.hints.map((h) => `${h.title}: ${h.detail}`).join(" | "),
      ]
        .map((c) => csvCell(c, d))
        .join(d),
    );
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
