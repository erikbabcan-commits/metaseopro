/**
 * Same-host multipage SEO crawler.
 * Every fetch goes through isSafePublicUrl and safeFetch (manual redirects,
 * re-checked after each hop). Robots Disallow is respected.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth.server";
import { SERP_LIMITS, textPixelWidth, validateJsonLd } from "@/lib/opportunity";
import { normalizeUrl } from "@/lib/raketa-schema";
import {
  isSafePublicUrl,
  safeFetch,
  SsrfBlockedError,
  TooManyRedirectsError,
  type DnsResolver,
} from "@/lib/ssrf";

export const DEFAULT_PAGE_LIMIT = 25;
export const DEFAULT_CRAWL_TIMEOUT_MS = 30_000;
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_BYTES = 1_000_000;
export const CRAWLER_USER_AGENT = "Mozilla/5.0 (compatible; SEO4WEBBot/1.0)";

export type FindingSeverity = "critical" | "warning" | "info";

export type CrawlStepState =
  "BLOCKED: ROBOTS" | "BLOCKED: SSRF" | "NO_SITEMAP" | "TIMEOUT" | "PARTIAL_CRAWL";

export type CrawlFinding = {
  url: string;
  severity: FindingSeverity;
  code: string;
  message: string;
};

export type HreflangRef = { lang: string; href: string };

export type PageAudit = {
  url: string;
  status: number;
  title: string;
  titleLength: number;
  titlePixelWidth: number;
  description: string;
  descriptionLength: number;
  descriptionPixelWidth: number;
  h1Count: number;
  canonical: string | null;
  noindex: boolean;
  hreflang: HreflangRef[];
  og: Record<string, string>;
  twitter: Record<string, string>;
  jsonLdErrors: string[];
  imagesWithoutAlt: number;
  internalLinks: string[];
  brokenInternalLinks: string[];
  findings: CrawlFinding[];
};

export type CrawlResult = {
  startUrl: string;
  host: string;
  pages: PageAudit[];
  findings: CrawlFinding[];
  stepStates: CrawlStepState[];
  crawledCount: number;
  discoveredCount: number;
};

export type CrawlOptions = {
  pageLimit?: number;
  timeoutMs?: number;
  requestTimeoutMs?: number;
  maxBytes?: number;
  fetchFn?: typeof fetch;
  resolver?: DnsResolver;
  signal?: AbortSignal;
  userAgent?: string;
};

type RobotsRule = { allow: boolean; pattern: string };
type RobotsGroup = { agents: string[]; rules: RobotsRule[] };

export type ParsedRobots = {
  groups: RobotsGroup[];
  sitemaps: string[];
};

type FetchOk = { ok: true; url: string; status: number; headers: Headers; body: string };
type FetchErr = {
  ok: false;
  url: string;
  status?: number;
  error: "SSRF" | "TIMEOUT" | "NETWORK";
};
type FetchOutcome = FetchOk | FetchErr;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().trim().replace(/\.+$/, "");
}

function isSameHost(a: string, b: string): boolean {
  try {
    return normalizeHost(new URL(a).hostname) === normalizeHost(new URL(b).hostname);
  } catch {
    return false;
  }
}

export function canonicalizeCrawlUrl(raw: string, base?: string): string | null {
  let url: URL;
  try {
    url = base ? new URL(raw, base) : new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.hash = "";
  if (!url.pathname) url.pathname = "/";
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

function pathAndQuery(raw: string): string {
  try {
    const url = new URL(raw);
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return "/";
  }
}

function finding(
  url: string,
  severity: FindingSeverity,
  code: string,
  message: string,
): CrawlFinding {
  return { url, severity, code, message };
}

function addState(states: CrawlStepState[], state: CrawlStepState): void {
  if (!states.includes(state)) states.push(state);
}

export function parseRobotsTxt(text: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let fresh = true;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) {
      fresh = true;
      continue;
    }
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "sitemap" && value) {
      sitemaps.push(value);
      continue;
    }
    if (field === "user-agent" && value) {
      if (!current || fresh) {
        current = { agents: [value.toLowerCase()], rules: [] };
        groups.push(current);
      } else {
        current.agents.push(value.toLowerCase());
      }
      fresh = false;
      continue;
    }
    if ((field === "disallow" || field === "allow") && current) {
      current.rules.push({ allow: field === "allow", pattern: value });
      fresh = false;
    }
  }
  return { groups, sitemaps };
}

function patternToRegex(pattern: string): RegExp {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]!;
    if (ch === "*") {
      source += ".*";
    } else if (ch === "$" && i === pattern.length - 1) {
      source += "$";
    } else {
      source += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}`);
}

export function isPathAllowed(robots: ParsedRobots, path: string, userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  const exact = robots.groups.filter((g) => g.agents.some((a) => a === ua));
  const wildcard = robots.groups.filter((g) => g.agents.includes("*"));
  const groups = exact.length > 0 ? exact : wildcard;
  if (groups.length === 0) return true;

  let best: { length: number; allow: boolean } | null = null;
  for (const group of groups) {
    for (const rule of group.rules) {
      if (rule.pattern === "") continue;
      const re = patternToRegex(rule.pattern);
      if (!re.test(path)) continue;
      const length = rule.pattern.replace(/\$$/, "").length;
      if (!best || length > best.length || (length === best.length && rule.allow && !best.allow)) {
        best = { length, allow: rule.allow };
      }
    }
  }
  return best ? best.allow : true;
}

export function parseSitemapLocs(xml: string): { locs: string[]; isIndex: boolean } {
  const isIndex = /<sitemapindex\b/i.test(xml);
  const locs: string[] = [];
  const re = /<loc\b[^>]*>\s*([^<\s][^<]*)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    const loc = decodeEntities(match[1]!.trim());
    if (loc) locs.push(loc);
  }
  return { locs, isIndex };
}

function extractMeta(html: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<meta\\b[^>]*(?:name|property)\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']*)["']`,
    "i",
  );
  const match = re.exec(html);
  if (match) return decodeEntities(match[1]!.trim());
  const re2 = new RegExp(
    `<meta\\b[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*(?:name|property)\\s*=\\s*["']${escaped}["']`,
    "i",
  );
  const match2 = re2.exec(html);
  return match2 ? decodeEntities(match2[1]!.trim()) : "";
}

function extractTitle(html: string): string {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match) return "";
  return decodeEntities(
    match[1]!
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function countH1(html: string): number {
  const matches = html.match(/<h1\b[^>]*>/gi);
  return matches?.length ?? 0;
}

function extractCanonical(html: string): string | null {
  const re = /<link\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const tag = match[0];
    const rel = /\brel\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (!rel) continue;
    const tokens = rel[1]!.split(/\s+/).map((t) => t.toLowerCase());
    if (!tokens.includes("canonical")) continue;
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (href) return decodeEntities(href[1]!.trim());
  }
  return null;
}

function extractHreflang(html: string): HreflangRef[] {
  const out: HreflangRef[] = [];
  const re = /<link\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const tag = match[0];
    const rel = /\brel\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (!rel) continue;
    const tokens = rel[1]!.split(/\s+/).map((t) => t.toLowerCase());
    if (!tokens.includes("alternate")) continue;
    const lang = /\bhreflang\s*=\s*["']([^"']+)["']/i.exec(tag);
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (lang && href) {
      out.push({ lang: lang[1]!.trim(), href: decodeEntities(href[1]!.trim()) });
    }
  }
  return out;
}

function extractNamedMetaPrefix(html: string, prefix: "og:" | "twitter:"): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const tag = match[0];
    const keyM = /\b(?:name|property)\s*=\s*["']([^"']+)["']/i.exec(tag) ?? null;
    const valM = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag);
    if (!keyM || !valM) continue;
    const key = keyM[1]!.trim();
    if (key.toLowerCase().startsWith(prefix)) {
      out[key.toLowerCase()] = decodeEntities(valM[1]!.trim());
    }
  }
  return out;
}

function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const attrs = match[1] ?? "";
    if (!/type\s*=\s*["']application\/ld\+json["']/i.test(attrs)) continue;
    const body = (match[2] ?? "").trim();
    if (body) blocks.push(body);
  }
  return blocks;
}

function countImagesWithoutAlt(html: string): number {
  const tags = html.match(/<img\b[^>]*>/gi) ?? [];
  let count = 0;
  for (const tag of tags) {
    const alt = /\balt\s*=\s*(["'])(.*?)\1/i.exec(tag);
    if (!alt || alt[2]!.trim() === "") count += 1;
  }
  return count;
}

function extractInternalLinks(html: string, pageUrl: string, startUrl: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /<a\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const hrefM = /\bhref\s*=\s*["']([^"']+)["']/i.exec(match[0]);
    if (!hrefM) continue;
    const raw = decodeEntities(hrefM[1]!.trim());
    if (!raw || raw.startsWith("#")) continue;
    const lower = raw.toLowerCase();
    if (
      lower.startsWith("mailto:") ||
      lower.startsWith("tel:") ||
      lower.startsWith("javascript:") ||
      lower.startsWith("data:")
    ) {
      continue;
    }
    const abs = canonicalizeCrawlUrl(raw, pageUrl);
    if (!abs || !isSameHost(abs, startUrl) || !isSafePublicUrl(abs)) continue;
    if (seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
  }
  return out;
}

function hasNoindex(html: string, headers: Headers): boolean {
  const header = headers.get("x-robots-tag") ?? "";
  if (/\bnoindex\b/i.test(header)) return true;
  for (const name of ["robots", "googlebot"]) {
    const content = extractMeta(html, name);
    if (/\bnoindex\b/i.test(content)) return true;
  }
  return false;
}

async function readCappedBody(
  res: Response,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    return text.length > maxBytes ? text.slice(0, maxBytes) : text;
  }
  const decoder = new TextDecoder();
  let body = "";
  let received = 0;
  try {
    for (;;) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = maxBytes - received;
      if (remaining <= 0) {
        void reader.cancel().catch(() => undefined);
        break;
      }
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      received += chunk.byteLength;
      body += decoder.decode(chunk, { stream: true });
      if (value.byteLength > remaining) {
        void reader.cancel().catch(() => undefined);
        break;
      }
    }
  } finally {
    body += decoder.decode();
  }
  return body;
}

async function fetchDocument(
  rawUrl: string,
  options: {
    fetchFn?: typeof fetch;
    resolver?: DnsResolver;
    signal?: AbortSignal;
    timeoutMs: number;
    maxBytes: number;
    userAgent: string;
    accept: string;
  },
): Promise<FetchOutcome> {
  const url = canonicalizeCrawlUrl(rawUrl) ?? rawUrl;
  if (!isSafePublicUrl(url)) {
    return { ok: false, url, error: "SSRF" };
  }

  let lastUrl = url;
  const trackedFetch: typeof fetch = (input, init) => {
    lastUrl =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const fetchFn = options.fetchFn ?? fetch;
    return fetchFn(input, init);
  };

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const res = await safeFetch(
      url,
      {
        signal: controller.signal,
        headers: {
          "User-Agent": options.userAgent,
          Accept: options.accept,
        },
      },
      {
        fetchFn: trackedFetch,
        resolver: options.resolver,
        timeoutMs: options.timeoutMs,
      },
    );

    const finalUrl = canonicalizeCrawlUrl(res.url || lastUrl) ?? lastUrl;
    if (!isSafePublicUrl(finalUrl)) {
      return { ok: false, url: finalUrl, error: "SSRF" };
    }

    const body = await readCappedBody(res, options.maxBytes, options.signal);
    return { ok: true, url: finalUrl, status: res.status, headers: res.headers, body };
  } catch (err) {
    if (err instanceof SsrfBlockedError || err instanceof TooManyRedirectsError) {
      return { ok: false, url: lastUrl, error: "SSRF" };
    }
    const aborted =
      options.signal?.aborted ||
      (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError"));
    return { ok: false, url: lastUrl, error: aborted ? "TIMEOUT" : "NETWORK" };
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
  }
}

function looksLikeXml(body: string, contentType: string, url: string): boolean {
  const ct = contentType.toLowerCase();
  if (ct.includes("xml") || ct.includes("text/plain"))
    return /<(\?xml|urlset|sitemapindex)\b/i.test(body);
  if (!ct || ct.includes("octet-stream")) {
    return /<(\?xml|urlset|sitemapindex)\b/i.test(body) || /\.xml(\?|$)/i.test(url);
  }
  return /<(\?xml|urlset|sitemapindex)\b/i.test(body);
}

async function discoverSitemaps(
  startUrl: string,
  robotsSitemaps: string[],
  fetchOpts: Parameters<typeof fetchDocument>[1],
  signal: AbortSignal,
  stepStates: CrawlStepState[],
  findings: CrawlFinding[],
): Promise<string[]> {
  const origin = new URL(startUrl).origin;
  const candidates: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string, base?: string) => {
    const abs = canonicalizeCrawlUrl(raw, base);
    if (!abs || seen.has(abs)) return;
    if (!isSameHost(abs, startUrl) || !isSafePublicUrl(abs)) return;
    seen.add(abs);
    candidates.push(abs);
  };

  for (const loc of robotsSitemaps) push(loc, startUrl);
  push(`${origin}/sitemap.xml`);
  push(`${origin}/sitemap_index.xml`);

  const pageUrls: string[] = [];
  const pageSeen = new Set<string>();
  const collectPage = (raw: string) => {
    const abs = canonicalizeCrawlUrl(raw, startUrl);
    if (!abs || pageSeen.has(abs)) return;
    if (!isSameHost(abs, startUrl) || !isSafePublicUrl(abs)) return;
    pageSeen.add(abs);
    pageUrls.push(abs);
  };

  const indexQueue = [...candidates];
  const visitedSitemaps = new Set<string>();
  const maxSitemaps = 10;
  const maxUrls = 1000;

  while (indexQueue.length > 0 && visitedSitemaps.size < maxSitemaps && !signal.aborted) {
    const sitemapUrl = indexQueue.shift()!;
    if (visitedSitemaps.has(sitemapUrl)) continue;
    visitedSitemaps.add(sitemapUrl);

    const result = await fetchDocument(sitemapUrl, fetchOpts);
    if (!result.ok) {
      if (result.error === "SSRF") {
        addState(stepStates, "BLOCKED: SSRF");
        findings.push(
          finding(
            result.url,
            "critical",
            "SSRF_BLOCKED",
            "Sitemap URL nie je povolená (SSRF ochrana).",
          ),
        );
      }
      continue;
    }
    if (result.status >= 400) continue;
    const ct = result.headers.get("content-type") ?? "";
    if (!looksLikeXml(result.body, ct, result.url)) continue;

    const parsed = parseSitemapLocs(result.body);
    if (parsed.isIndex) {
      for (const loc of parsed.locs) {
        if (indexQueue.length + visitedSitemaps.size >= maxSitemaps) break;
        const abs = canonicalizeCrawlUrl(loc, result.url);
        if (abs && !visitedSitemaps.has(abs)) indexQueue.push(abs);
      }
    } else {
      for (const loc of parsed.locs) {
        if (pageUrls.length >= maxUrls) break;
        collectPage(loc);
      }
    }
  }

  return pageUrls;
}

function auditPageHtml(
  pageUrl: string,
  startUrl: string,
  status: number,
  headers: Headers,
  html: string,
): PageAudit {
  const title = extractTitle(html);
  const description = extractMeta(html, "description");
  const titlePixel = title ? textPixelWidth(title) : 0;
  const descPixel = description ? textPixelWidth(description) : 0;
  const h1Count = countH1(html);
  const canonicalRaw = extractCanonical(html);
  const canonical = canonicalRaw ? canonicalizeCrawlUrl(canonicalRaw, pageUrl) : null;
  const noindex = hasNoindex(html, headers);
  const hreflang = extractHreflang(html);
  const og = extractNamedMetaPrefix(html, "og:");
  const twitter = extractNamedMetaPrefix(html, "twitter:");
  const jsonLdErrors: string[] = [];
  const blocks = extractJsonLdBlocks(html);
  if (blocks.length === 0) {
    jsonLdErrors.push("Chýba JSON-LD.");
  } else {
    for (const block of blocks) {
      try {
        const parsed: unknown = JSON.parse(block);
        jsonLdErrors.push(...validateJsonLd(parsed));
      } catch {
        jsonLdErrors.push("JSON-LD sa nepodarilo spracovať.");
      }
    }
  }
  const imagesWithoutAlt = countImagesWithoutAlt(html);
  const internalLinks = extractInternalLinks(html, pageUrl, startUrl);
  const findings: CrawlFinding[] = [];

  if (status >= 400) {
    findings.push(
      finding(pageUrl, "critical", "HTTP_STATUS", `Stránka vrátila HTTP stav ${status}.`),
    );
  }

  if (!title) {
    findings.push(finding(pageUrl, "critical", "TITLE_MISSING", "Chýba title tag."));
  } else {
    if (title.length < 15) {
      findings.push(
        finding(pageUrl, "warning", "TITLE_SHORT", "Title je príliš krátky (menej ako 15 znakov)."),
      );
    }
    if (title.length > 60) {
      findings.push(
        finding(pageUrl, "warning", "TITLE_LONG", "Title je príliš dlhý (viac ako 60 znakov)."),
      );
    }
    if (titlePixel > SERP_LIMITS.desktopTitle) {
      findings.push(
        finding(
          pageUrl,
          "warning",
          "TITLE_PIXEL",
          `Title presahuje ${SERP_LIMITS.desktopTitle} px v SERP (${Math.round(titlePixel)} px).`,
        ),
      );
    }
  }

  if (!description) {
    findings.push(finding(pageUrl, "warning", "DESCRIPTION_MISSING", "Chýba meta description."));
  } else {
    if (description.length < 70) {
      findings.push(
        finding(
          pageUrl,
          "warning",
          "DESCRIPTION_SHORT",
          "Meta description je príliš krátka (menej ako 70 znakov).",
        ),
      );
    }
    if (description.length > 160) {
      findings.push(
        finding(
          pageUrl,
          "warning",
          "DESCRIPTION_LONG",
          "Meta description je príliš dlhá (viac ako 160 znakov).",
        ),
      );
    }
    if (descPixel > SERP_LIMITS.desktopDesc) {
      findings.push(
        finding(
          pageUrl,
          "warning",
          "DESCRIPTION_PIXEL",
          `Meta description presahuje ${SERP_LIMITS.desktopDesc} px v SERP (${Math.round(descPixel)} px).`,
        ),
      );
    }
  }

  if (h1Count === 0) {
    findings.push(finding(pageUrl, "warning", "H1_MISSING", "Chýba H1 nadpis."));
  } else if (h1Count > 1) {
    findings.push(finding(pageUrl, "warning", "H1_MULTIPLE", `Stránka má ${h1Count} H1 nadpisov.`));
  }

  if (!canonicalRaw) {
    findings.push(finding(pageUrl, "warning", "CANONICAL_MISSING", "Chýba canonical odkaz."));
  } else if (!canonical) {
    findings.push(finding(pageUrl, "warning", "CANONICAL_INVALID", "Canonical URL je neplatná."));
  } else if (!isSameHost(canonical, startUrl)) {
    findings.push(
      finding(pageUrl, "warning", "CANONICAL_HOST", "Canonical ukazuje na inú doménu."),
    );
  }

  if (noindex) {
    findings.push(
      finding(pageUrl, "warning", "NOINDEX", "Stránka má noindex a nebude indexovaná."),
    );
  }

  for (const ref of hreflang) {
    const abs = canonicalizeCrawlUrl(ref.href, pageUrl);
    if (!abs) {
      findings.push(
        finding(
          pageUrl,
          "warning",
          "HREFLANG_INVALID",
          `Neplatný hreflang href pre jazyk „${ref.lang}“.`,
        ),
      );
    }
  }

  if (!og["og:title"]) {
    findings.push(finding(pageUrl, "warning", "OG_TITLE_MISSING", "Chýba og:title."));
  }
  if (!og["og:description"]) {
    findings.push(finding(pageUrl, "warning", "OG_DESCRIPTION_MISSING", "Chýba og:description."));
  }
  if (!og["og:image"]) {
    findings.push(finding(pageUrl, "warning", "OG_IMAGE_MISSING", "Chýba og:image."));
  }
  if (!og["og:url"]) {
    findings.push(finding(pageUrl, "warning", "OG_URL_MISSING", "Chýba og:url."));
  }
  if (!twitter["twitter:card"]) {
    findings.push(finding(pageUrl, "warning", "TWITTER_CARD_MISSING", "Chýba twitter:card."));
  }

  if (blocks.length === 0) {
    findings.push(finding(pageUrl, "info", "JSON_LD_MISSING", "Chýba JSON-LD."));
  } else {
    for (const err of jsonLdErrors) {
      const code = err === "JSON-LD sa nepodarilo spracovať." ? "JSON_LD_INVALID" : "JSON_LD_ERROR";
      findings.push(finding(pageUrl, "warning", code, err));
    }
  }

  if (imagesWithoutAlt > 0) {
    findings.push(
      finding(
        pageUrl,
        "warning",
        "IMAGE_ALT_MISSING",
        `${imagesWithoutAlt} ${imagesWithoutAlt === 1 ? "obrázok nemá" : "obrázkov nemá"} atribút alt.`,
      ),
    );
  }

  return {
    url: pageUrl,
    status,
    title,
    titleLength: title.length,
    titlePixelWidth: titlePixel,
    description,
    descriptionLength: description.length,
    descriptionPixelWidth: descPixel,
    h1Count,
    canonical: canonical ?? canonicalRaw,
    noindex,
    hreflang,
    og,
    twitter,
    jsonLdErrors,
    imagesWithoutAlt,
    internalLinks,
    brokenInternalLinks: [],
    findings,
  };
}

function emptyErrorPage(url: string, status: number, message: string, code: string): PageAudit {
  return {
    url,
    status,
    title: "",
    titleLength: 0,
    titlePixelWidth: 0,
    description: "",
    descriptionLength: 0,
    descriptionPixelWidth: 0,
    h1Count: 0,
    canonical: null,
    noindex: false,
    hreflang: [],
    og: {},
    twitter: {},
    jsonLdErrors: [],
    imagesWithoutAlt: 0,
    internalLinks: [],
    brokenInternalLinks: [],
    findings: [finding(url, "critical", code, message)],
  };
}

export async function crawlSite(
  rawStartUrl: string,
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  const pageLimit = Math.min(
    Math.max(options.pageLimit ?? DEFAULT_PAGE_LIMIT, 1),
    DEFAULT_PAGE_LIMIT,
  );
  const timeoutMs = options.timeoutMs ?? DEFAULT_CRAWL_TIMEOUT_MS;
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const userAgent = options.userAgent ?? CRAWLER_USER_AGENT;
  const stepStates: CrawlStepState[] = [];
  const findings: CrawlFinding[] = [];
  const pages: PageAudit[] = [];

  const normalized = normalizeUrl(rawStartUrl) ?? canonicalizeCrawlUrl(rawStartUrl);
  if (!normalized) {
    const invalid = finding(rawStartUrl, "critical", "INVALID_URL", "Neplatná URL adresa.");
    return {
      startUrl: rawStartUrl,
      host: "",
      pages: [],
      findings: [invalid],
      stepStates: [],
      crawledCount: 0,
      discoveredCount: 0,
    };
  }

  if (!isSafePublicUrl(normalized)) {
    addState(stepStates, "BLOCKED: SSRF");
    findings.push(
      finding(normalized, "critical", "SSRF_BLOCKED", "URL nie je povolená (SSRF ochrana)."),
    );
    return {
      startUrl: normalized,
      host: "",
      pages: [],
      findings,
      stepStates,
      crawledCount: 0,
      discoveredCount: 0,
    };
  }

  const startUrl = canonicalizeCrawlUrl(normalized) ?? normalized;
  const host = normalizeHost(new URL(startUrl).hostname);
  const origin = new URL(startUrl).origin;

  const crawlController = new AbortController();
  const timer = setTimeout(() => crawlController.abort(), timeoutMs);
  const onParentAbort = () => crawlController.abort();
  options.signal?.addEventListener("abort", onParentAbort, { once: true });

  const fetchOpts = {
    fetchFn: options.fetchFn,
    resolver: options.resolver,
    signal: crawlController.signal,
    timeoutMs: requestTimeoutMs,
    maxBytes,
    userAgent,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  const botName = userAgent.includes("SEO4WEBBot") ? "SEO4WEBBot" : userAgent;
  let discoveredCount = 0;

  try {
    const robotsResult = await fetchDocument(`${origin}/robots.txt`, {
      ...fetchOpts,
      accept: "text/plain,text/*;q=0.8,*/*;q=0.1",
    });

    let robots: ParsedRobots = { groups: [], sitemaps: [] };
    if (!robotsResult.ok) {
      if (robotsResult.error === "SSRF") {
        addState(stepStates, "BLOCKED: SSRF");
        findings.push(
          finding(
            robotsResult.url,
            "critical",
            "SSRF_BLOCKED",
            "robots.txt nie je povolený (SSRF ochrana).",
          ),
        );
        return { startUrl, host, pages, findings, stepStates, crawledCount: 0, discoveredCount: 0 };
      }
      if (robotsResult.error === "TIMEOUT") {
        addState(stepStates, "TIMEOUT");
      }
    } else if (robotsResult.status < 400) {
      robots = parseRobotsTxt(robotsResult.body);
    }

    if (!isPathAllowed(robots, pathAndQuery(startUrl), botName)) {
      addState(stepStates, "BLOCKED: ROBOTS");
      findings.push(
        finding(
          startUrl,
          "critical",
          "ROBOTS_DISALLOW",
          "robots.txt zakazuje prehľadávanie tejto URL.",
        ),
      );
      return { startUrl, host, pages, findings, stepStates, crawledCount: 0, discoveredCount: 0 };
    }

    const sitemapUrls = await discoverSitemaps(
      startUrl,
      robots.sitemaps,
      fetchOpts,
      crawlController.signal,
      stepStates,
      findings,
    );
    if (sitemapUrls.length === 0) {
      addState(stepStates, "NO_SITEMAP");
    }

    const queue: string[] = [];
    const queued = new Set<string>();
    const enqueue = (url: string) => {
      if (queued.has(url)) return;
      if (!isSameHost(url, startUrl) || !isSafePublicUrl(url)) return;
      if (!isPathAllowed(robots, pathAndQuery(url), botName)) return;
      queued.add(url);
      queue.push(url);
    };

    enqueue(startUrl);
    for (const url of sitemapUrls) enqueue(url);
    discoveredCount = queued.size;

    const statusByUrl = new Map<string, number>();
    const inbound = new Map<string, Set<string>>();
    const rememberLink = (from: string, to: string) => {
      let set = inbound.get(to);
      if (!set) {
        set = new Set();
        inbound.set(to, set);
      }
      set.add(from);
    };

    while (queue.length > 0) {
      if (crawlController.signal.aborted) {
        addState(stepStates, "TIMEOUT");
        if (pages.length > 0 || queue.length > 0) addState(stepStates, "PARTIAL_CRAWL");
        break;
      }
      if (pages.length >= pageLimit) {
        addState(stepStates, "PARTIAL_CRAWL");
        break;
      }

      const url = queue.shift()!;
      const result = await fetchDocument(url, fetchOpts);
      if (crawlController.signal.aborted && result.ok === false && result.error === "TIMEOUT") {
        addState(stepStates, "TIMEOUT");
        enqueueFront(queue, url);
        if (pages.length > 0 || queue.length > 0) addState(stepStates, "PARTIAL_CRAWL");
        break;
      }

      if (!result.ok) {
        if (result.error === "SSRF") {
          addState(stepStates, "BLOCKED: SSRF");
          const page = emptyErrorPage(
            result.url,
            0,
            "URL nie je povolená (SSRF ochrana).",
            "SSRF_BLOCKED",
          );
          pages.push(page);
          statusByUrl.set(url, 0);
          statusByUrl.set(result.url, 0);
          continue;
        }
        if (result.error === "TIMEOUT") {
          addState(stepStates, "TIMEOUT");
          addState(stepStates, "PARTIAL_CRAWL");
          break;
        }
        const page = emptyErrorPage(url, 0, "Stránku sa nepodarilo načítať.", "FETCH_FAILED");
        pages.push(page);
        statusByUrl.set(url, 0);
        continue;
      }

      const pageUrl = isSameHost(result.url, startUrl) ? result.url : url;
      if (!isSafePublicUrl(pageUrl)) {
        addState(stepStates, "BLOCKED: SSRF");
        pages.push(
          emptyErrorPage(pageUrl, 0, "URL nie je povolená (SSRF ochrana).", "SSRF_BLOCKED"),
        );
        continue;
      }

      const audit = auditPageHtml(pageUrl, startUrl, result.status, result.headers, result.body);
      pages.push(audit);
      statusByUrl.set(url, result.status);
      statusByUrl.set(pageUrl, result.status);

      if (result.status < 400) {
        for (const link of audit.internalLinks) {
          rememberLink(pageUrl, link);
          if (!queued.has(link)) {
            enqueue(link);
            discoveredCount = queued.size;
          }
        }
      }
    }

    if (queue.length > 0 && !stepStates.includes("TIMEOUT") && pages.length >= pageLimit) {
      addState(stepStates, "PARTIAL_CRAWL");
    }

    attachBrokenLinks(pages, statusByUrl, inbound);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onParentAbort);
  }

  for (const page of pages) findings.push(...page.findings);

  return {
    startUrl,
    host,
    pages,
    findings,
    stepStates,
    crawledCount: pages.length,
    discoveredCount,
  };
}

function enqueueFront(queue: string[], url: string): void {
  if (!queue.includes(url)) queue.unshift(url);
}

function attachBrokenLinks(
  pages: PageAudit[],
  statusByUrl: Map<string, number>,
  inbound: Map<string, Set<string>>,
): void {
  const byUrl = new Map(pages.map((p) => [p.url, p]));
  for (const [target, sources] of inbound) {
    const status = statusByUrl.get(target);
    const broken = status !== undefined && (status === 0 || status >= 400);
    if (!broken) continue;
    for (const source of sources) {
      const page = byUrl.get(source);
      if (!page) continue;
      if (!page.brokenInternalLinks.includes(target)) {
        page.brokenInternalLinks.push(target);
        page.findings.push(
          finding(source, "critical", "BROKEN_INTERNAL_LINK", `Neplatný interný odkaz: ${target}`),
        );
      }
    }
  }
}

const CrawlInputSchema = z.object({
  url: z.string().min(1).max(2048),
  pageLimit: z.number().int().min(1).max(DEFAULT_PAGE_LIMIT).optional(),
});

export const crawlSiteFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => CrawlInputSchema.parse(input))
  .handler(async ({ data }) => {
    const request = getRequest();
    const auth = await requireUser(request);
    if (!auth.ok) {
      throw new Error("Vyžaduje sa prihlásenie.");
    }
    return crawlSite(data.url, { pageLimit: data.pageLimit });
  });
