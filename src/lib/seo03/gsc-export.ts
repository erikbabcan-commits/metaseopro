/**
 * SEO-03 demo: turns parsed GSC "Pages" exports into per-page metrics for two
 * periods. Period A is the older one ("minulých 90 dní"), period B the newer
 * one ("aktuálnych 90 dní"). Internally A = `previous`, B = `current`.
 *
 * Supported inputs (UX spec SEO03-SPEC.md §3):
 * - two single-period exports (A and B), joined by normalized URL;
 * - one file with paired columns: GSC compare export ("Last/Previous 3 months
 *   Clicks"), `Clicks_A`/`Clicks_B`, `Clicks (period 1)`/`(period 2)`,
 *   `Kliky (obdobie A)`/`(obdobie B)`, `Clicks Previous`/`Clicks Current`.
 * A GSC preamble ("Top pages", "Start date: …") before the header is skipped.
 */
import {
  MAX_DATA_ROWS,
  Seo03Error,
  type RequiredColumn,
  normalizeHeader,
  parseCsv,
  parseNumber,
} from "./csv";

export type PeriodMetrics = {
  clicks: number;
  impressions: number | null;
  /** Click-through rate as a fraction 0..1. */
  ctr: number | null;
  position: number | null;
};

export type PageComparison = {
  /** URL as first seen in the export. */
  page: string;
  previous: PeriodMetrics;
  current: PeriodMetrics;
  /** Set when the page is absent from one of two single-period files. */
  missingIn?: "previous" | "current";
};

export type ParsedExport = {
  rows: PageComparison[];
  periodLabels: { current: string; previous: string };
  skippedEmpty: number;
  skippedInvalid: number;
  skippedDuplicate: number;
  /** Data rows read (excluding header and preamble), for the progress card. */
  rowsRead: number;
};

export type SinglePeriodExport = {
  pages: Map<string, { page: string; metrics: PeriodMetrics }>;
  label: string | null;
  skippedEmpty: number;
  skippedInvalid: number;
  skippedDuplicate: number;
  rowsRead: number;
};

export type ExportFile =
  { kind: "compare"; data: ParsedExport } | { kind: "single"; data: SinglePeriodExport };

type Metric = "clicks" | "impressions" | "ctr" | "position";
type Period = "current" | "previous";
type MetricColumn = { index: number; header: string };

const PAGE_HEADERS = new Set([
  "page",
  "pages",
  "url",
  "adresa url",
  "stranka",
  "stranky",
  "landing page",
  "top pages",
  "najlepsie stranky",
  "najcastejsie stranky",
]);

/** Order matters: CTR ("click through rate") before clicks. */
const METRIC_PATTERNS: { metric: Metric; pattern: RegExp }[] = [
  { metric: "ctr", pattern: /\b(ctr|click through rate|clickthrough rate|miera prekliknutia)\b/ },
  { metric: "clicks", pattern: /\b(clicks|kliky|kliknutia|kliknuti)\b/ },
  { metric: "impressions", pattern: /\b(impressions|impresie|zobrazenia|zobrazeni|imps)\b/ },
  {
    metric: "position",
    pattern: /\b(position|pozicia|pozice|average position|avg\.? position|priemerna pozicia)\b/,
  },
];

const QUERY_HEADER_RE = /^(query|queries|top queries|dopyt|dopyty|najlepsie dopyty)$/;
const PREVIOUS_RE = /\b(previous|prior|predchadzajuc\w*|predosl\w*|minul\w*|predchozi\w*)\b/;
const CURRENT_RE = /\b(last|current|posledn\w*|aktualn\w*)\b/;
const SIDE_A_RE = /\b(a|period 1|obdobie 1|1)$/;
const SIDE_B_RE = /\b(b|period 2|obdobie 2|2)$/;

/** Header text with `_`/brackets turned into spaces, lowercased, no diacritics. */
function headerKey(header: string): string {
  return normalizeHeader(header.replace(/^"|"$/g, "").replace(/[_()[\]]/g, " "));
}

function classifyHeader(header: string): Metric | null {
  const h = headerKey(header);
  for (const { metric, pattern } of METRIC_PATTERNS) if (pattern.test(h)) return metric;
  return null;
}

function isPageHeader(header: string): boolean {
  return PAGE_HEADERS.has(headerKey(header));
}

/** What remains of a header after removing the metric word, e.g. "a", "last 3 months". */
function periodPart(header: string): string {
  let h = headerKey(header);
  for (const { pattern } of METRIC_PATTERNS) h = h.replace(pattern, " ");
  return h.replace(/\s+/g, " ").trim();
}

function sideOf(header: string): Period | null {
  const rest = periodPart(header);
  if (PREVIOUS_RE.test(rest)) return "previous";
  if (CURRENT_RE.test(rest)) return "current";
  if (/^(obdobie )?a$/.test(rest) || SIDE_A_RE.test(rest)) return "previous";
  if (/^(obdobie )?b$/.test(rest) || SIDE_B_RE.test(rest)) return "current";
  return null;
}

function firstDate(header: string): string | null {
  const m = /(\d{4}-\d{2}-\d{2})/.exec(header);
  return m ? m[1] : null;
}

/** Decides which of two paired columns is A (previous) and which is B (current). */
function pairSides(a: string, b: string): [Period, Period] {
  const sa = sideOf(a);
  const sb = sideOf(b);
  if (sa && sb && sa !== sb) return [sa, sb];
  if (sa && !sb) return [sa, sa === "previous" ? "current" : "previous"];
  if (sb && !sa) return [sb === "previous" ? "current" : "previous", sb];
  const da = firstDate(a);
  const db = firstDate(b);
  if (da && db && da !== db) return da > db ? ["current", "previous"] : ["previous", "current"];
  // GSC compare exports list the newer period first.
  return ["current", "previous"];
}

function slovakUnit(n: number, unit: string): string {
  if (/^day/i.test(unit)) return n === 1 ? "deň" : n >= 2 && n <= 4 ? "dni" : "dní";
  return n === 1 ? "mesiac" : n >= 2 && n <= 4 ? "mesiace" : "mesiacov";
}

/** "Last 3 months" -> "Posledné 3 mesiace"; other labels are kept as exported. */
export function localizePeriodLabel(label: string): string {
  const m = /^(last|previous)\s+(\d+)\s+(months?|days?)$/i.exec(label.trim());
  if (!m) return label;
  const n = Number(m[2]);
  const word = m[1].toLowerCase() === "last" ? "Posledné" : "Predchádzajúce";
  return `${word} ${n} ${slovakUnit(n, m[3])}`;
}

function periodLabelFromHeader(header: string, side: Period): string {
  const rest = periodPart(header);
  if (/^(obdobie |period )?(a|b|1|2)$/.test(rest) || rest === "") {
    return side === "previous" ? "Obdobie A" : "Obdobie B";
  }
  // Keep original casing: strip the metric word from the raw header.
  const raw = header
    .replace(/[_()[\]]/g, " ")
    .replace(
      /\b(clicks|kliky|kliknutia|kliknutí|impressions|impresie|zobrazenia|ctr|position|pozícia)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  return localizePeriodLabel(raw || header.trim());
}

const skDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}. ${m}. ${y}`;
};

/** Reads "Start date: 2026-05-26" / "End date: …" lines from a GSC preamble. */
function labelFromPreamble(preamble: string[][]): string | null {
  let start: string | null = null;
  let end: string | null = null;
  for (const row of preamble) {
    const line = normalizeHeader(row.join(" "));
    const date = /(\d{4}-\d{2}-\d{2})/.exec(line)?.[1];
    if (!date) continue;
    if (/\b(start|od|zaciatok)\b/.test(line)) start = date;
    else if (/\b(end|do|koniec)\b/.test(line)) end = date;
  }
  return start && end ? `${skDate(start)} – ${skDate(end)}` : null;
}

/**
 * Normalizes a URL for pairing: lowercase host, no fragment, no utm_* params,
 * no trailing slash (except the root).
 */
export function normalizePageKey(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
    const search = url.searchParams.toString();
    return `${url.protocol}//${url.host.toLowerCase()}${path}${search ? `?${search}` : ""}`;
  } catch {
    const noHash = trimmed.split("#")[0];
    return noHash.length > 1 ? noHash.replace(/\/+$/, "") : noHash;
  }
}

type Layout = {
  headerRow: number;
  pageIndex: number;
  columns: Record<Period, Partial<Record<Metric, number>>>;
  labels: Record<Period, string>;
  periods: 1 | 2;
};

const COLUMN_LABEL: Record<RequiredColumn, string> = {
  page: "Page (alebo URL / Stránka)",
  clicks: "Clicks (alebo Kliky / Kliknutia)",
};

export function describeMissingColumn(column: RequiredColumn): string {
  return COLUMN_LABEL[column];
}

function wrongFormat(candidate: string[] | undefined): never {
  const found = (candidate ?? []).map((c) => c.trim()).filter(Boolean);
  const missing: RequiredColumn[] = [];
  if (!found.some(isPageHeader)) missing.push("page");
  if (!found.some((h) => classifyHeader(h) === "clicks")) missing.push("clicks");
  const looksLikeQueries = found.some((h) => QUERY_HEADER_RE.test(headerKey(h)));
  throw new Seo03Error(
    "WRONG_FORMAT",
    `Chýbajú povinné stĺpce: ${missing.map(describeMissingColumn).join(", ")}.` +
      (looksLikeQueries ? " Toto vyzerá ako export dopytov, nie stránok." : ""),
    { missing, found, looksLikeQueries },
  );
}

function detectLayout(rows: string[][]): Layout {
  let candidate: string[] | undefined;
  let candidateScore = 0;
  for (let r = 0; r < Math.min(rows.length, 25); r++) {
    const headers = rows[r];
    const pageIndex = headers.findIndex(isPageHeader);
    const byMetric: Record<Metric, MetricColumn[]> = {
      clicks: [],
      impressions: [],
      ctr: [],
      position: [],
    };
    headers.forEach((header, index) => {
      if (index === pageIndex) return;
      const metric = classifyHeader(header);
      if (metric) byMetric[metric].push({ index, header });
    });
    const score =
      (pageIndex >= 0 ? 1 : 0) +
      Object.values(byMetric).reduce((s, c) => s + c.length, 0) +
      (headers.some((h) => QUERY_HEADER_RE.test(headerKey(h))) ? 1 : 0);
    if (score > candidateScore) {
      candidate = headers;
      candidateScore = score;
    }
    if (pageIndex < 0 || byMetric.clicks.length === 0) continue;

    const columns: Layout["columns"] = { current: {}, previous: {} };
    const labels = { current: "Obdobie B", previous: "Obdobie A" };
    if (byMetric.clicks.length === 1) {
      for (const metric of Object.keys(byMetric) as Metric[]) {
        if (byMetric[metric][0]) columns.current[metric] = byMetric[metric][0].index;
      }
      return { headerRow: r, pageIndex, columns, labels, periods: 1 };
    }
    if (byMetric.clicks.length !== 2) {
      throw new Seo03Error(
        "WRONG_FORMAT",
        "Súbor obsahuje viac ako dve obdobia kliknutí. Porovnajte presne dve obdobia.",
        { found: headers.filter(Boolean) },
      );
    }
    const [c0, c1] = byMetric.clicks;
    const [p0, p1] = pairSides(c0.header, c1.header);
    labels[p0] = periodLabelFromHeader(c0.header, p0);
    labels[p1] = periodLabelFromHeader(c1.header, p1);
    for (const metric of Object.keys(byMetric) as Metric[]) {
      const cols = byMetric[metric];
      if (cols.length !== 2) continue;
      const [a, b] = pairSides(cols[0].header, cols[1].header);
      columns[a][metric] = cols[0].index;
      columns[b][metric] = cols[1].index;
    }
    return { headerRow: r, pageIndex, columns, labels, periods: 2 };
  }
  return wrongFormat(candidate);
}

function readMetrics(row: string[], cols: Partial<Record<Metric, number>>): PeriodMetrics | null {
  const cell = (metric: Metric) => {
    const idx = cols[metric];
    return idx === undefined ? undefined : (row[idx] ?? "");
  };
  const clicksRaw = cell("clicks");
  const clicks = clicksRaw === undefined ? null : parseNumber(clicksRaw, true);
  if (clicks === null || clicks < 0) return null;
  const opt = (metric: Metric, integer: boolean) => {
    const raw = cell(metric);
    return raw === undefined ? null : parseNumber(raw, integer);
  };
  const impressions = opt("impressions", true);
  let ctr = opt("ctr", false);
  if (ctr !== null) {
    // "2.95%" or "2.95" are percentages; "0.0295" is already a fraction.
    const raw = cell("ctr") ?? "";
    if (raw.includes("%") || ctr > 1) ctr = ctr / 100;
  } else if (impressions && impressions > 0) {
    ctr = clicks / impressions;
  }
  return { clicks, impressions, ctr, position: opt("position", false) };
}

function readTable(text: string): string[][] {
  if (text.includes("\u0000")) {
    throw new Seo03Error("NOT_TEXT", "Súbor nie je textový CSV. Nahrajte export vo formáte CSV.");
  }
  const rows = parseCsv(text, { maxRows: MAX_DATA_ROWS });
  if (!rows.some((r) => r.some((c) => c.trim() !== ""))) {
    throw new Seo03Error("EMPTY_FILE", "Súbor je prázdny.");
  }
  return rows;
}

const isEmptyRow = (row: string[]) => row.every((c) => c.trim() === "");

/** Parses one uploaded file; detects whether it holds one or two periods. */
export function parseExportFile(text: string): ExportFile {
  const rows = readTable(text);
  const layout = detectLayout(rows);
  const body = rows.slice(layout.headerRow + 1);
  let skippedEmpty = 0;
  let skippedInvalid = 0;
  let skippedDuplicate = 0;

  if (layout.periods === 1) {
    const pages: SinglePeriodExport["pages"] = new Map();
    for (const row of body) {
      if (isEmptyRow(row)) {
        skippedEmpty++;
        continue;
      }
      const page = (row[layout.pageIndex] ?? "").trim();
      const metrics = readMetrics(row, layout.columns.current);
      if (!page || !metrics) {
        skippedInvalid++;
        continue;
      }
      const key = normalizePageKey(page);
      if (pages.has(key)) {
        skippedDuplicate++;
        continue;
      }
      pages.set(key, { page, metrics });
    }
    return {
      kind: "single",
      data: {
        pages,
        label: labelFromPreamble(rows.slice(0, layout.headerRow)),
        skippedEmpty,
        skippedInvalid,
        skippedDuplicate,
        rowsRead: body.length,
      },
    };
  }

  const seen = new Set<string>();
  const out: PageComparison[] = [];
  for (const row of body) {
    if (isEmptyRow(row)) {
      skippedEmpty++;
      continue;
    }
    const page = (row[layout.pageIndex] ?? "").trim();
    const current = readMetrics(row, layout.columns.current);
    const previous = readMetrics(row, layout.columns.previous);
    if (!page || !current || !previous) {
      skippedInvalid++;
      continue;
    }
    const key = normalizePageKey(page);
    if (seen.has(key)) {
      skippedDuplicate++;
      continue;
    }
    seen.add(key);
    out.push({ page, previous, current });
  }
  return {
    kind: "compare",
    data: {
      rows: out,
      periodLabels: layout.labels,
      skippedEmpty,
      skippedInvalid,
      skippedDuplicate,
      rowsRead: body.length,
    },
  };
}

function assertHasRows(data: ParsedExport): ParsedExport {
  if (data.rows.length > 0) return data;
  const onlyEmpty = data.skippedInvalid === 0 && data.skippedDuplicate === 0;
  throw new Seo03Error(
    onlyEmpty ? "EMPTY_FILE" : "NO_VALID_ROWS",
    onlyEmpty
      ? "Súbor obsahuje iba hlavičku, žiadne stránky."
      : "V súbore nie je ani jeden platný riadok (chýba stránka alebo číselná hodnota kliknutí).",
  );
}

/** Parses one file that must contain both periods. */
export function parseCompareExport(text: string): ParsedExport {
  const file = parseExportFile(text);
  if (file.kind !== "compare") {
    throw new Seo03Error(
      "SINGLE_PERIOD",
      "Súbor obsahuje iba jedno obdobie. Nahrajte aj druhé obdobie alebo export so stĺpcami pre obe obdobia.",
    );
  }
  return assertHasRows(file.data);
}

const ZERO: PeriodMetrics = { clicks: 0, impressions: 0, ctr: null, position: null };

/** Joins period A (older) and period B (newer). A page missing in one file counts as 0 clicks there. */
export function joinPeriods(a: SinglePeriodExport, b: SinglePeriodExport): ParsedExport {
  const keys = new Set([...a.pages.keys(), ...b.pages.keys()]);
  const rows: PageComparison[] = [];
  for (const key of keys) {
    const inA = a.pages.get(key);
    const inB = b.pages.get(key);
    rows.push({
      page: (inA ?? inB)!.page,
      previous: inA?.metrics ?? ZERO,
      current: inB?.metrics ?? ZERO,
      ...(inA && !inB ? { missingIn: "current" as const } : {}),
      ...(inB && !inA ? { missingIn: "previous" as const } : {}),
    });
  }
  return assertHasRows({
    rows,
    periodLabels: { previous: a.label ?? "Obdobie A", current: b.label ?? "Obdobie B" },
    skippedEmpty: a.skippedEmpty + b.skippedEmpty,
    skippedInvalid: a.skippedInvalid + b.skippedInvalid,
    skippedDuplicate: a.skippedDuplicate + b.skippedDuplicate,
    rowsRead: a.rowsRead + b.rowsRead,
  });
}

/** Parses two single-period exports: A = older period, B = newer period. */
export function parseTwoPeriodExports(textA: string, textB: string): ParsedExport {
  const a = parseExportFile(textA);
  const b = parseExportFile(textB);
  if (a.kind !== "single" || b.kind !== "single") {
    throw new Seo03Error(
      "WRONG_FORMAT",
      "Pri dvoch samostatných súboroch má mať každý iba jedno obdobie.",
    );
  }
  return joinPeriods(a.data, b.data);
}

/** Most frequent host among the pages, e.g. "eshop-priklad.sk". */
export function dominantHost(rows: PageComparison[]): string | null {
  const counts = new Map<string, number>();
  for (const { page } of rows) {
    try {
      const host = new URL(page).host.toLowerCase().replace(/^www\./, "");
      counts.set(host, (counts.get(host) ?? 0) + 1);
    } catch {
      // relative paths have no host
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [host, count] of counts) {
    if (count > bestCount) {
      best = host;
      bestCount = count;
    }
  }
  return best;
}
