/**
 * SEO-03 demo: turns a parsed GSC "Pages" export into per-page metrics for two
 * periods. Supports the GSC compare export (both periods in one file, EN/SK
 * headers) and two separate single-period exports joined by page URL.
 */
import { MAX_DATA_ROWS, Seo03Error, normalizeHeader, parseCsv, parseNumber } from "./csv";

export type PeriodMetrics = {
  clicks: number;
  impressions: number | null;
  /** Click-through rate as a fraction 0..1. */
  ctr: number | null;
  position: number | null;
};

export type PageComparison = {
  page: string;
  current: PeriodMetrics;
  previous: PeriodMetrics;
};

export type ParsedExport = {
  rows: PageComparison[];
  periodLabels: { current: string; previous: string };
  skippedEmpty: number;
  skippedInvalid: number;
  skippedDuplicate: number;
};

type Metric = "clicks" | "impressions" | "ctr" | "position";
type Period = "current" | "previous";
type MetricColumn = { index: number; metric: Metric; header: string };

const PAGE_HEADERS = [
  "top pages",
  "page",
  "pages",
  "url",
  "landing page",
  "najlepsie stranky",
  "najcastejsie stranky",
  "popularne stranky",
  "stranky",
  "stranka",
  "adresa url",
];

const METRIC_PATTERNS: { metric: Metric; pattern: RegExp }[] = [
  { metric: "clicks", pattern: /\b(clicks|kliknutia|kliknuti|kliky)\b/ },
  { metric: "impressions", pattern: /\b(impressions|zobrazenia|zobrazeni)\b/ },
  { metric: "ctr", pattern: /\bctr\b/ },
  { metric: "position", pattern: /\b(position|pozicia|priemerna pozicia|pozice)\b/ },
];

const PREVIOUS_RE = /\b(previous|prior|predchadzajuc\w*|predosl\w*|minul\w*|predchozi\w*)\b/;
const CURRENT_RE = /\b(last|current|posledn\w*|aktualn\w*|tento|toto)\b/;

function classifyHeader(header: string): Metric | null {
  const h = normalizeHeader(header);
  for (const { metric, pattern } of METRIC_PATTERNS) if (pattern.test(h)) return metric;
  return null;
}

function findPageColumn(headers: string[]): number {
  const normalized = headers.map(normalizeHeader);
  const exact = normalized.findIndex((h) => PAGE_HEADERS.includes(h));
  if (exact > -1) return exact;
  return normalized.findIndex((h) => /\b(pages?|stranky|stranka|url)\b/.test(h));
}

/** Earliest ISO date in a header like "2026-08-01 - 2026-10-31 Clicks", if any. */
function firstDate(header: string): string | null {
  const m = /(\d{4}-\d{2}-\d{2})/.exec(header);
  return m ? m[1] : null;
}

function periodOf(a: string, b: string): [Period, Period] {
  const na = normalizeHeader(a);
  const nb = normalizeHeader(b);
  if (PREVIOUS_RE.test(na) && !PREVIOUS_RE.test(nb)) return ["previous", "current"];
  if (PREVIOUS_RE.test(nb) && !PREVIOUS_RE.test(na)) return ["current", "previous"];
  if (CURRENT_RE.test(nb) && !CURRENT_RE.test(na)) return ["previous", "current"];
  const da = firstDate(a);
  const db = firstDate(b);
  if (da && db && da !== db) return da > db ? ["current", "previous"] : ["previous", "current"];
  // GSC lists the newer period first.
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

function periodLabel(header: string, metricWord: RegExp): string {
  const cleaned = header.replace(metricWord, "").replace(/\s+/g, " ").trim();
  return localizePeriodLabel(cleaned || header.trim());
}

const METRIC_WORD_RE =
  /\b(clicks|impressions|ctr|position|kliknutia|kliknutí|zobrazenia|pozícia|priemerná pozícia)\b/i;

type Layout = {
  pageIndex: number;
  columns: Record<Period, Partial<Record<Metric, number>>>;
  labels: Record<Period, string>;
  periods: 1 | 2;
};

function detectLayout(headers: string[]): Layout {
  const pageIndex = findPageColumn(headers);
  const byMetric: Record<Metric, MetricColumn[]> = {
    clicks: [],
    impressions: [],
    ctr: [],
    position: [],
  };
  headers.forEach((header, index) => {
    if (index === pageIndex) return;
    const metric = classifyHeader(header);
    if (metric) byMetric[metric].push({ index, metric, header });
  });
  if (pageIndex < 0 || byMetric.clicks.length === 0) {
    throw new Seo03Error(
      "WRONG_FORMAT",
      "Nespoznali sme formát. Očakávame export „Stránky“ zo Search Console so stĺpcom stránok (Top pages / Stránky) a stĺpcom kliknutí (Clicks / Kliknutia).",
    );
  }
  const columns: Layout["columns"] = { current: {}, previous: {} };
  const labels = { current: "Aktuálne obdobie", previous: "Predchádzajúce obdobie" };
  if (byMetric.clicks.length === 1) {
    for (const metric of Object.keys(byMetric) as Metric[]) {
      if (byMetric[metric][0]) columns.current[metric] = byMetric[metric][0].index;
    }
    return { pageIndex, columns, labels, periods: 1 };
  }
  if (byMetric.clicks.length !== 2) {
    throw new Seo03Error(
      "WRONG_FORMAT",
      "Export obsahuje viac ako dve obdobia kliknutí. Porovnaj v Search Console presne dve obdobia.",
    );
  }
  const [c0, c1] = byMetric.clicks;
  const [p0, p1] = periodOf(c0.header, c1.header);
  labels[p0] = periodLabel(c0.header, METRIC_WORD_RE);
  labels[p1] = periodLabel(c1.header, METRIC_WORD_RE);
  for (const metric of Object.keys(byMetric) as Metric[]) {
    const cols = byMetric[metric];
    if (cols.length !== 2) continue;
    const [a, b] = periodOf(cols[0].header, cols[1].header);
    columns[a][metric] = cols[0].index;
    columns[b][metric] = cols[1].index;
  }
  return { pageIndex, columns, labels, periods: 2 };
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
    // GSC exports CTR as "4.5%"; treat any value above 1 as a percentage.
    const raw = cell("ctr") ?? "";
    if (raw.includes("%") || ctr > 1) ctr = ctr / 100;
  } else if (impressions && impressions > 0) {
    ctr = clicks / impressions;
  }
  return { clicks, impressions, ctr, position: opt("position", false) };
}

type SinglePeriod = {
  pages: Map<string, PeriodMetrics>;
  label: string;
  skippedEmpty: number;
  skippedInvalid: number;
  skippedDuplicate: number;
};

function readTable(text: string): { headers: string[]; body: string[][] } {
  if (text.includes("\u0000")) {
    throw new Seo03Error("NOT_TEXT", "Súbor nie je textový CSV. Nahraj export vo formáte CSV.");
  }
  const rows = parseCsv(text, { maxRows: MAX_DATA_ROWS });
  const firstNonEmpty = rows.findIndex((r) => r.some((c) => c.trim() !== ""));
  if (firstNonEmpty < 0) {
    throw new Seo03Error("EMPTY_FILE", "Súbor je prázdny.");
  }
  return { headers: rows[firstNonEmpty], body: rows.slice(firstNonEmpty + 1) };
}

/** Parses one GSC compare export (both periods in one file). */
export function parseCompareExport(text: string): ParsedExport {
  const { headers, body } = readTable(text);
  const layout = detectLayout(headers);
  if (layout.periods === 1) {
    throw new Seo03Error(
      "SINGLE_PERIOD",
      "Súbor obsahuje iba jedno obdobie. Exportuj v Search Console porovnanie dvoch období, alebo nahraj dva samostatné exporty.",
    );
  }
  const seen = new Set<string>();
  const rows: PageComparison[] = [];
  let skippedEmpty = 0;
  let skippedInvalid = 0;
  let skippedDuplicate = 0;
  for (const row of body) {
    if (row.every((c) => c.trim() === "")) {
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
    if (seen.has(page)) {
      skippedDuplicate++;
      continue;
    }
    seen.add(page);
    rows.push({ page, current, previous });
  }
  if (rows.length === 0) {
    throw new Seo03Error(
      body.length === skippedEmpty ? "EMPTY_FILE" : "NO_VALID_ROWS",
      body.length === skippedEmpty
        ? "Súbor obsahuje iba hlavičku, žiadne stránky."
        : "V súbore nie je ani jeden platný riadok (chýba stránka alebo číslo kliknutí).",
    );
  }
  return { rows, periodLabels: layout.labels, skippedEmpty, skippedInvalid, skippedDuplicate };
}

function parseSinglePeriod(text: string, fallbackLabel: string): SinglePeriod {
  const { headers, body } = readTable(text);
  const layout = detectLayout(headers);
  if (layout.periods !== 1) {
    throw new Seo03Error(
      "WRONG_FORMAT",
      "Pri dvoch samostatných súboroch má mať každý iba jedno obdobie.",
    );
  }
  const pages = new Map<string, PeriodMetrics>();
  let skippedEmpty = 0;
  let skippedInvalid = 0;
  let skippedDuplicate = 0;
  for (const row of body) {
    if (row.every((c) => c.trim() === "")) {
      skippedEmpty++;
      continue;
    }
    const page = (row[layout.pageIndex] ?? "").trim();
    const metrics = readMetrics(row, layout.columns.current);
    if (!page || !metrics) {
      skippedInvalid++;
      continue;
    }
    if (pages.has(page)) {
      skippedDuplicate++;
      continue;
    }
    pages.set(page, metrics);
  }
  return { pages, label: fallbackLabel, skippedEmpty, skippedInvalid, skippedDuplicate };
}

const ZERO: PeriodMetrics = { clicks: 0, impressions: 0, ctr: null, position: null };

/** Joins two single-period exports by page URL. Missing pages count as 0 clicks. */
export function parseTwoPeriodExports(currentText: string, previousText: string): ParsedExport {
  const cur = parseSinglePeriod(currentText, "Aktuálne obdobie");
  const prev = parseSinglePeriod(previousText, "Predchádzajúce obdobie");
  const pages = new Set([...cur.pages.keys(), ...prev.pages.keys()]);
  const rows: PageComparison[] = [];
  for (const page of pages) {
    rows.push({
      page,
      current: cur.pages.get(page) ?? ZERO,
      previous: prev.pages.get(page) ?? ZERO,
    });
  }
  if (rows.length === 0) {
    throw new Seo03Error("NO_VALID_ROWS", "V súboroch nie je ani jeden platný riadok.");
  }
  return {
    rows,
    periodLabels: { current: cur.label, previous: prev.label },
    skippedEmpty: cur.skippedEmpty + prev.skippedEmpty,
    skippedInvalid: cur.skippedInvalid + prev.skippedInvalid,
    skippedDuplicate: cur.skippedDuplicate + prev.skippedDuplicate,
  };
}
