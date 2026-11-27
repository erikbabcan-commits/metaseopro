export type PageSpeedStrategy = "mobile" | "desktop";

export interface PageSpeedScores {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
}

export interface PageSpeedMetric {
  value: number | null;
  displayValue: string | null;
  score: number | null;
}

export interface PageSpeedOpportunity {
  id: string;
  title: string;
  displayValue: string | null;
  savingsMs: number | null;
}

export interface PageSpeedReport {
  url: string;
  strategy: PageSpeedStrategy;
  fetchedAt: string;
  cached: boolean;
  scores: PageSpeedScores;
  metrics: {
    lcp: PageSpeedMetric;
    cls: PageSpeedMetric;
    fcp: PageSpeedMetric;
    tbt: PageSpeedMetric;
    ttfb: PageSpeedMetric;
  };
  opportunities: PageSpeedOpportunity[];
}

interface CacheEntry {
  expiresAt: number;
  report: PageSpeedReport;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const reportCache = new Map<string, CacheEntry>();

const PRIVATE_HOST_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|0\.0\.0\.0|\[::1?\])$/i;

export function normalizePageSpeedUrl(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error("Zadajte URL alebo doménu na meranie.");
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("Neplatný formát URL adresy.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Povolené sú len protokoly http a https.");
  }

  if (PRIVATE_HOST_RE.test(parsed.hostname) || !parsed.hostname.includes(".")) {
    throw new Error("Interné alebo neplatné domény nie je možné merať.");
  }

  return parsed.toString();
}

export function clearPageSpeedCache(): void {
  reportCache.clear();
}

function toScorePercent(score: unknown): number | null {
  return typeof score === "number" && Number.isFinite(score) ? Math.round(score * 100) : null;
}

interface RawAudit {
  id?: string;
  title?: string;
  score?: number | null;
  numericValue?: number;
  displayValue?: string;
  details?: {
    type?: string;
    overallSavingsMs?: number;
  };
}

function extractMetric(audits: Record<string, RawAudit> | undefined, key: string): PageSpeedMetric {
  const audit = audits?.[key];
  return {
    value: typeof audit?.numericValue === "number" ? audit.numericValue : null,
    displayValue: typeof audit?.displayValue === "string" ? audit.displayValue : null,
    score: typeof audit?.score === "number" ? audit.score : null,
  };
}

export async function fetchPageSpeedReport(
  rawUrl: string,
  strategy: PageSpeedStrategy = "mobile",
): Promise<PageSpeedReport> {
  const normalizedUrl = normalizePageSpeedUrl(rawUrl);
  const cacheKey = `${strategy}:${normalizedUrl}`;
  const now = Date.now();
  const cached = reportCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { ...cached.report, cached: true };
  }

  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", normalizedUrl);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.append("category", "performance");
  endpoint.searchParams.append("category", "seo");
  endpoint.searchParams.append("category", "accessibility");
  endpoint.searchParams.append("category", "best-practices");

  const apiKey = process.env.PAGESPEED_API_KEY?.trim();
  if (apiKey) {
    endpoint.searchParams.set("key", apiKey);
  }

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`PageSpeed API vrátilo chybu ${response.status} (${response.statusText}).`);
  }

  const payload = (await response.json()) as {
    lighthouseResult?: {
      finalUrl?: string;
      categories?: Record<string, { score?: number | null }>;
      audits?: Record<string, RawAudit>;
    };
  };

  const lh = payload.lighthouseResult;
  const categories = lh?.categories;
  const audits = lh?.audits;

  const opportunities: PageSpeedOpportunity[] = Object.entries(audits ?? {})
    .filter(([, audit]) => {
      const savings = audit?.details?.overallSavingsMs;
      return (
        audit?.details?.type === "opportunity" &&
        typeof savings === "number" &&
        savings >= 100 &&
        typeof audit?.title === "string"
      );
    })
    .sort(([, a], [, b]) => (b.details?.overallSavingsMs ?? 0) - (a.details?.overallSavingsMs ?? 0))
    .slice(0, 3)
    .map(([id, audit]) => ({
      id,
      title: audit.title ?? id,
      displayValue: typeof audit.displayValue === "string" ? audit.displayValue : null,
      savingsMs:
        typeof audit.details?.overallSavingsMs === "number"
          ? Math.round(audit.details.overallSavingsMs)
          : null,
    }));

  const report: PageSpeedReport = {
    url: lh?.finalUrl ?? normalizedUrl,
    strategy,
    fetchedAt: new Date(now).toISOString(),
    cached: false,
    scores: {
      performance: toScorePercent(categories?.performance?.score),
      seo: toScorePercent(categories?.seo?.score),
      accessibility: toScorePercent(categories?.accessibility?.score),
      bestPractices: toScorePercent(categories?.["best-practices"]?.score),
    },
    metrics: {
      lcp: extractMetric(audits, "largest-contentful-paint"),
      cls: extractMetric(audits, "cumulative-layout-shift"),
      fcp: extractMetric(audits, "first-contentful-paint"),
      tbt: extractMetric(audits, "total-blocking-time"),
      ttfb: extractMetric(audits, "server-response-time"),
    },
    opportunities,
  };

  reportCache.set(cacheKey, {
    expiresAt: now + CACHE_TTL_MS,
    report,
  });

  return report;
}
