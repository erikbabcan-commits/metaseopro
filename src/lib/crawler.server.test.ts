import { afterEach, describe, expect, it, vi } from "vitest";
import { SERP_LIMITS, textPixelWidth } from "@/lib/opportunity";
import {
  canonicalizeCrawlUrl,
  crawlSite,
  DEFAULT_PAGE_LIMIT,
  isPathAllowed,
  parseRobotsTxt,
  parseSitemapLocs,
} from "@/lib/crawler.server";
import type { DnsResolver } from "@/lib/ssrf";

const publicResolver: DnsResolver = {
  resolve: async () => ["93.184.216.34"],
};

function html({
  title = "SEO služby pre firmy na Slovensku",
  description = "Kompletné SEO služby a technický audit pre firmy na Slovensku s merateľnými výsledkami pre rast webu.",
  h1 = "<h1>SEO služby</h1>",
  extras = "",
  body = "<p>Obsah stránky s dostatočným textom pre bežnú kontrolu.</p>",
}: {
  title?: string;
  description?: string;
  h1?: string;
  extras?: string;
  body?: string;
} = {}): string {
  return `<!DOCTYPE html><html><head>
    <title>${title}</title>
    ${description ? `<meta name="description" content="${description}">` : ""}
    <link rel="canonical" href="https://mojweb.sk/">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="https://mojweb.sk/og.png">
    <meta property="og:url" content="https://mojweb.sk/">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Mojweb"}]}</script>
  </head><body>${h1}${body}${extras}</body></html>`;
}

function xmlSitemap(locs: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${locs.map((loc) => `<url><loc>${loc}</loc></url>`).join("\n")}
  </urlset>`;
}

function xmlIndex(locs: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${locs.map((loc) => `<sitemap><loc>${loc}</loc></sitemap>`).join("\n")}
  </sitemapindex>`;
}

function ok(body: string, contentType = "text/html; charset=utf-8", status = 200): Response {
  return new Response(body, { status, headers: { "content-type": contentType } });
}

function redirect(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } });
}

type MockHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function mockFetch(routes: Record<string, Response | MockHandler>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const exact = routes[url];
    if (typeof exact === "function") return exact(url, init);
    if (exact) return exact.clone();
    const withoutSlash = url.endsWith("/") ? url.slice(0, -1) : `${url}/`;
    const alt = routes[withoutSlash];
    if (typeof alt === "function") return alt(url, init);
    if (alt) return alt.clone();
    return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
  }) as unknown as typeof fetch;
}

async function crawl(
  url: string,
  routes: Record<string, Response | MockHandler>,
  opts: Record<string, unknown> = {},
) {
  return crawlSite(url, {
    fetchFn: mockFetch(routes),
    resolver: publicResolver,
    pageLimit: 10,
    timeoutMs: 5_000,
    ...opts,
  });
}

describe("robots and sitemap parsers", () => {
  it("parses User-agent groups, Allow/Disallow and Sitemap", () => {
    const robots = parseRobotsTxt(`
User-agent: *
Disallow: /admin
Allow: /admin/public
Sitemap: https://mojweb.sk/sitemap.xml

User-agent: SEO4WEBBot
Disallow: /private
`);
    expect(robots.sitemaps).toEqual(["https://mojweb.sk/sitemap.xml"]);
    expect(isPathAllowed(robots, "/admin/secret", "SEO4WEBBot")).toBe(true);
    expect(isPathAllowed(robots, "/private", "SEO4WEBBot")).toBe(false);
    expect(isPathAllowed(robots, "/admin/secret", "OtherBot")).toBe(false);
    expect(isPathAllowed(robots, "/admin/public", "OtherBot")).toBe(true);
  });

  it("treats a missing matching rule as allowed", () => {
    const robots = parseRobotsTxt("User-agent: *\nDisallow: /tmp\n");
    expect(isPathAllowed(robots, "/about", "*")).toBe(true);
  });

  it("parses urlset and sitemap index loc entries", () => {
    const pages = parseSitemapLocs(xmlSitemap(["https://mojweb.sk/a", "https://mojweb.sk/b"]));
    expect(pages.isIndex).toBe(false);
    expect(pages.locs).toEqual(["https://mojweb.sk/a", "https://mojweb.sk/b"]);
    const index = parseSitemapLocs(xmlIndex(["https://mojweb.sk/sitemap-pages.xml"]));
    expect(index.isIndex).toBe(true);
    expect(index.locs).toEqual(["https://mojweb.sk/sitemap-pages.xml"]);
  });

  it("canonicalizes crawl URLs without fragments and trailing slashes", () => {
    expect(canonicalizeCrawlUrl("https://mojweb.sk/about/#top")).toBe("https://mojweb.sk/about");
    expect(canonicalizeCrawlUrl("/kontakt", "https://mojweb.sk/")).toBe(
      "https://mojweb.sk/kontakt",
    );
  });
});

describe("crawlSite discovery and limits", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("discovers pages from robots.txt sitemap and crawls same-host URLs", async () => {
    const result = await crawl("https://mojweb.sk/", {
      "https://mojweb.sk/robots.txt": ok(
        "User-agent: *\nAllow: /\nSitemap: https://mojweb.sk/sitemap.xml\n",
        "text/plain",
      ),
      "https://mojweb.sk/sitemap.xml": ok(
        xmlSitemap(["https://mojweb.sk/", "https://mojweb.sk/o-nas"]),
        "application/xml",
      ),
      "https://mojweb.sk/sitemap_index.xml": ok("nope", "text/html", 404),
      "https://mojweb.sk/": ok(html({ extras: '<a href="/o-nas">O nás</a>' })),
      "https://mojweb.sk/o-nas": ok(
        html({ title: "O nás – SEO služby pre firmy na webe", extras: '<a href="/">Domov</a>' }),
      ),
    });

    expect(result.stepStates).not.toContain("NO_SITEMAP");
    expect(result.stepStates).not.toContain("BLOCKED: ROBOTS");
    expect(result.crawledCount).toBe(2);
    expect(result.pages.map((p) => p.url).sort()).toEqual([
      "https://mojweb.sk/",
      "https://mojweb.sk/o-nas",
    ]);
  });

  it("follows a sitemap index and then the nested urlset", async () => {
    const result = await crawl("https://mojweb.sk/", {
      "https://mojweb.sk/robots.txt": ok("User-agent: *\nDisallow:\n", "text/plain"),
      "https://mojweb.sk/sitemap.xml": ok(
        xmlIndex(["https://mojweb.sk/sitemaps/pages.xml"]),
        "application/xml",
      ),
      "https://mojweb.sk/sitemap_index.xml": ok("missing", "text/plain", 404),
      "https://mojweb.sk/sitemaps/pages.xml": ok(
        xmlSitemap(["https://mojweb.sk/", "https://mojweb.sk/blog"]),
        "application/xml",
      ),
      "https://mojweb.sk/": ok(html()),
      "https://mojweb.sk/blog": ok(html({ title: "Blog o SEO pre slovenské firmy a eshopy" })),
    });

    expect(result.pages.some((p) => p.url === "https://mojweb.sk/blog")).toBe(true);
    expect(result.stepStates).not.toContain("NO_SITEMAP");
  });

  it("falls back to the homepage and internal links when no sitemap exists", async () => {
    const result = await crawl("https://mojweb.sk/", {
      "https://mojweb.sk/robots.txt": ok("User-agent: *\nAllow: /\n", "text/plain"),
      "https://mojweb.sk/sitemap.xml": ok("not xml", "text/html", 404),
      "https://mojweb.sk/sitemap_index.xml": ok("not xml", "text/html", 404),
      "https://mojweb.sk/": ok(
        html({ extras: '<a href="/kontakt">Kontakt</a><a href="https://cudziweb.sk/x">Von</a>' }),
      ),
      "https://mojweb.sk/kontakt": ok(
        html({ title: "Kontaktujte našu SEO agentúru na Slovensku" }),
      ),
      "https://cudziweb.sk/x": ok(html({ title: "Cudzí web by sa nemal prehľadávať teraz" })),
    });

    expect(result.stepStates).toContain("NO_SITEMAP");
    expect(result.pages.map((p) => p.url).sort()).toEqual([
      "https://mojweb.sk/",
      "https://mojweb.sk/kontakt",
    ]);
    expect(result.pages.some((p) => p.url.includes("cudziweb"))).toBe(false);
  });

  it("respects robots Disallow and does not fetch blocked paths", async () => {
    const fetchFn = mockFetch({
      "https://mojweb.sk/robots.txt": ok("User-agent: *\nDisallow: /tajne\n", "text/plain"),
      "https://mojweb.sk/sitemap.xml": ok("no", "text/html", 404),
      "https://mojweb.sk/sitemap_index.xml": ok("no", "text/html", 404),
      "https://mojweb.sk/": ok(html({ extras: '<a href="/tajne">Tajné</a><a href="/ok">OK</a>' })),
      "https://mojweb.sk/ok": ok(html({ title: "Verejná podstránka so správnou dĺžkou title" })),
      "https://mojweb.sk/tajne": ok(html({ title: "Toto sa nesmie stiahnuť z disallowed path" })),
    });
    const result = await crawlSite("https://mojweb.sk/", {
      fetchFn,
      resolver: publicResolver,
      pageLimit: 10,
      timeoutMs: 5_000,
    });
    const requested = (fetchFn as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) =>
      String(c[0]),
    );
    expect(requested.some((u) => u.includes("/tajne"))).toBe(false);
    expect(result.pages.some((p) => p.url.endsWith("/tajne"))).toBe(false);
    expect(result.pages.some((p) => p.url.endsWith("/ok"))).toBe(true);
  });

  it("returns BLOCKED: ROBOTS when the start URL is disallowed", async () => {
    const fetchFn = mockFetch({
      "https://mojweb.sk/robots.txt": ok("User-agent: *\nDisallow: /\n", "text/plain"),
      "https://mojweb.sk/": ok(html()),
    });
    const result = await crawlSite("https://mojweb.sk/", {
      fetchFn,
      resolver: publicResolver,
      timeoutMs: 5_000,
    });
    expect(result.stepStates).toContain("BLOCKED: ROBOTS");
    expect(result.crawledCount).toBe(0);
    const requested = (fetchFn as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) =>
      String(c[0]),
    );
    expect(requested.some((u) => u === "https://mojweb.sk/" || u === "https://mojweb.sk")).toBe(
      false,
    );
  });

  it("marks PARTIAL_CRAWL when the page limit is hit with remaining URLs", async () => {
    const result = await crawl(
      "https://mojweb.sk/",
      {
        "https://mojweb.sk/robots.txt": ok("User-agent: *\nAllow: /\n", "text/plain"),
        "https://mojweb.sk/sitemap.xml": ok(
          xmlSitemap(["https://mojweb.sk/", "https://mojweb.sk/a", "https://mojweb.sk/b"]),
          "application/xml",
        ),
        "https://mojweb.sk/sitemap_index.xml": ok("no", "text/html", 404),
        "https://mojweb.sk/": ok(html({ extras: '<a href="/a">A</a><a href="/b">B</a>' })),
        "https://mojweb.sk/a": ok(html({ title: "Stránka A s dosť dlhým titulkom pre test" })),
        "https://mojweb.sk/b": ok(html({ title: "Stránka B s dosť dlhým titulkom pre test" })),
      },
      { pageLimit: 1 },
    );
    expect(result.crawledCount).toBe(1);
    expect(result.discoveredCount).toBeGreaterThan(1);
    expect(result.stepStates).toContain("PARTIAL_CRAWL");
  });

  it("defaults the page limit to 25", async () => {
    expect(DEFAULT_PAGE_LIMIT).toBe(25);
    const routes: Record<string, Response> = {
      "https://mojweb.sk/robots.txt": ok("User-agent: *\nAllow: /\n", "text/plain"),
      "https://mojweb.sk/sitemap.xml": ok("no", "text/html", 404),
      "https://mojweb.sk/sitemap_index.xml": ok("no", "text/html", 404),
    };
    const extras = Array.from({ length: 30 }, (_, i) => `<a href="/p${i}">P${i}</a>`).join("");
    routes["https://mojweb.sk/"] = ok(html({ extras }));
    for (let i = 0; i < 30; i++) {
      routes[`https://mojweb.sk/p${i}`] = ok(
        html({ title: `Podstránka číslo ${i} s dlhším titulkom` }),
      );
    }
    const result = await crawlSite("https://mojweb.sk/", {
      fetchFn: mockFetch(routes),
      resolver: publicResolver,
      timeoutMs: 10_000,
    });
    expect(result.crawledCount).toBe(25);
    expect(result.stepStates).toContain("PARTIAL_CRAWL");
  });

  it("marks TIMEOUT and PARTIAL_CRAWL when the overall budget is exceeded", async () => {
    const hang: MockHandler = async (_url, init) => {
      const signal = init?.signal;
      await new Promise<never>((_, reject) => {
        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
          once: true,
        });
      });
      return ok(html());
    };
    const result = await crawlSite("https://mojweb.sk/", {
      fetchFn: mockFetch({
        "https://mojweb.sk/robots.txt": ok("User-agent: *\nAllow: /\n", "text/plain"),
        "https://mojweb.sk/sitemap.xml": ok("no", "text/html", 404),
        "https://mojweb.sk/sitemap_index.xml": ok("no", "text/html", 404),
        "https://mojweb.sk/": hang,
      }),
      resolver: publicResolver,
      timeoutMs: 40,
      requestTimeoutMs: 5_000,
    });
    expect(result.stepStates).toContain("TIMEOUT");
  });
});

describe("crawlSite SSRF protection", () => {
  it("blocks private IPs and localhost without fetching them", async () => {
    const fetchFn = vi.fn(async () => ok(html())) as unknown as typeof fetch;
    for (const url of [
      "http://127.0.0.1/",
      "http://localhost/",
      "http://10.1.2.3/admin",
      "http://192.168.0.5/",
    ]) {
      const result = await crawlSite(url, { fetchFn, resolver: publicResolver, timeoutMs: 2_000 });
      expect(result.stepStates, url).toContain("BLOCKED: SSRF");
      expect(result.crawledCount, url).toBe(0);
      expect(
        result.findings.some((f) => f.code === "SSRF_BLOCKED"),
        url,
      ).toBe(true);
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("blocks a redirect to a private IP and records BLOCKED: SSRF", async () => {
    const fetchFn = mockFetch({
      "https://mojweb.sk/robots.txt": () => redirect("http://10.0.0.1/robots.txt"),
      "https://mojweb.sk/": ok(html()),
    });
    const result = await crawlSite("https://mojweb.sk/", {
      fetchFn,
      resolver: publicResolver,
      timeoutMs: 5_000,
    });
    expect(result.stepStates).toContain("BLOCKED: SSRF");
    expect(result.crawledCount).toBe(0);
    const requested = (fetchFn as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) =>
      String(c[0]),
    );
    expect(requested.some((u) => u.includes("10.0.0.1"))).toBe(false);
  });

  it("blocks a page-level redirect to a loopback address", async () => {
    const result = await crawl("https://mojweb.sk/", {
      "https://mojweb.sk/robots.txt": ok("User-agent: *\nAllow: /\n", "text/plain"),
      "https://mojweb.sk/sitemap.xml": ok("no", "text/html", 404),
      "https://mojweb.sk/sitemap_index.xml": ok("no", "text/html", 404),
      "https://mojweb.sk/": () => redirect("http://127.0.0.1/secret"),
    });
    expect(result.stepStates).toContain("BLOCKED: SSRF");
    expect(result.findings.some((f) => f.code === "SSRF_BLOCKED")).toBe(true);
  });
});

describe("crawlSite per-page checks", () => {
  it("reports title and description length and pixel-width issues", async () => {
    const longTitle = "M".repeat(80);
    const longDesc = "M".repeat(200);
    expect(textPixelWidth(longTitle)).toBeGreaterThan(SERP_LIMITS.desktopTitle);
    expect(textPixelWidth(longDesc)).toBeGreaterThan(SERP_LIMITS.desktopDesc);

    const result = await crawl("https://mojweb.sk/", {
      "https://mojweb.sk/robots.txt": ok("User-agent: *\nAllow: /\n", "text/plain"),
      "https://mojweb.sk/sitemap.xml": ok("no", "text/html", 404),
      "https://mojweb.sk/sitemap_index.xml": ok("no", "text/html", 404),
      "https://mojweb.sk/": ok(html({ title: longTitle, description: longDesc })),
    });
    const codes = result.pages[0]!.findings.map((f) => f.code);
    expect(codes).toContain("TITLE_LONG");
    expect(codes).toContain("TITLE_PIXEL");
    expect(codes).toContain("DESCRIPTION_LONG");
    expect(codes).toContain("DESCRIPTION_PIXEL");
    expect(result.pages[0]!.titleLength).toBe(80);
    expect(result.pages[0]!.titlePixelWidth).toBe(textPixelWidth(longTitle));
    expect(result.pages[0]!.descriptionPixelWidth).toBe(textPixelWidth(longDesc));
  });

  it("reports missing title, missing description, H1 count, canonical, noindex and hreflang", async () => {
    const page = `<!DOCTYPE html><html><head>
      <meta name="robots" content="noindex,follow">
      <link rel="alternate" hreflang="sk" href="https://mojweb.sk/">
      <link rel="alternate" hreflang="en" href="javascript:alert(1)">
    </head><body>
      <h1>Jeden</h1><h1>Dva</h1>
    </body></html>`;
    const result = await crawl("https://mojweb.sk/", {
      "https://mojweb.sk/robots.txt": ok("User-agent: *\nAllow: /\n", "text/plain"),
      "https://mojweb.sk/sitemap.xml": ok("no", "text/html", 404),
      "https://mojweb.sk/sitemap_index.xml": ok("no", "text/html", 404),
      "https://mojweb.sk/": ok(page),
    });
    const codes = result.pages[0]!.findings.map((f) => f.code);
    expect(codes).toContain("TITLE_MISSING");
    expect(codes).toContain("DESCRIPTION_MISSING");
    expect(codes).toContain("H1_MULTIPLE");
    expect(result.pages[0]!.h1Count).toBe(2);
    expect(codes).toContain("CANONICAL_MISSING");
    expect(result.pages[0]!.noindex).toBe(true);
    expect(codes).toContain("NOINDEX");
    expect(codes).toContain("HREFLANG_INVALID");
    expect(result.pages[0]!.hreflang).toEqual([
      { lang: "sk", href: "https://mojweb.sk/" },
      { lang: "en", href: "javascript:alert(1)" },
    ]);
  });

  it("reports missing OG and Twitter tags and JSON-LD issues via validateJsonLd", async () => {
    const page = `<!DOCTYPE html><html><head>
      <title>SEO služby pre slovenské firmy a weby</title>
      <meta name="description" content="Kompletné SEO služby a technický audit pre firmy na Slovensku s merateľnými výsledkami pre rast webu.">
      <script type="application/ld+json">{"@type":"Organization","name":"Mojweb","aggregateRating":{"ratingValue":5}}</script>
      <script type="application/ld+json">{not-json</script>
    </head><body><h1>SEO</h1></body></html>`;
    const result = await crawl("https://mojweb.sk/", {
      "https://mojweb.sk/robots.txt": ok("User-agent: *\nAllow: /\n", "text/plain"),
      "https://mojweb.sk/sitemap.xml": ok("no", "text/html", 404),
      "https://mojweb.sk/sitemap_index.xml": ok("no", "text/html", 404),
      "https://mojweb.sk/": ok(page),
    });
    const codes = result.pages[0]!.findings.map((f) => f.code);
    expect(codes).toContain("OG_TITLE_MISSING");
    expect(codes).toContain("OG_DESCRIPTION_MISSING");
    expect(codes).toContain("OG_IMAGE_MISSING");
    expect(codes).toContain("OG_URL_MISSING");
    expect(codes).toContain("TWITTER_CARD_MISSING");
    expect(codes).toContain("JSON_LD_INVALID");
    expect(codes).toContain("JSON_LD_ERROR");
    expect(result.pages[0]!.jsonLdErrors.some((e) => e.includes("aggregateRating"))).toBe(true);
    expect(result.pages[0]!.jsonLdErrors.some((e) => e.includes("@graph"))).toBe(true);
  });

  it("counts images without alt and flags broken internal links", async () => {
    const result = await crawl("https://mojweb.sk/", {
      "https://mojweb.sk/robots.txt": ok("User-agent: *\nAllow: /\n", "text/plain"),
      "https://mojweb.sk/sitemap.xml": ok("no", "text/html", 404),
      "https://mojweb.sk/sitemap_index.xml": ok("no", "text/html", 404),
      "https://mojweb.sk/": ok(
        html({
          extras:
            '<img src="/a.png"><img src="/b.png" alt=""><img src="/c.png" alt="Logo"><a href="/chyba">Chyba</a>',
        }),
      ),
      "https://mojweb.sk/chyba": new Response("gone", {
        status: 404,
        headers: { "content-type": "text/html" },
      }),
    });
    const home = result.pages.find((p) => p.url === "https://mojweb.sk/")!;
    expect(home.imagesWithoutAlt).toBe(2);
    expect(home.findings.some((f) => f.code === "IMAGE_ALT_MISSING")).toBe(true);
    const brokenPage = result.pages.find((p) => p.url === "https://mojweb.sk/chyba");
    expect(brokenPage?.status).toBe(404);
    expect(home.brokenInternalLinks).toContain("https://mojweb.sk/chyba");
    expect(home.findings.some((f) => f.code === "BROKEN_INTERNAL_LINK")).toBe(true);
    expect(home.findings.find((f) => f.code === "BROKEN_INTERNAL_LINK")?.severity).toBe("critical");
  });

  it("caps the downloaded response body", async () => {
    const huge = `<!DOCTYPE html><html><head><title>SEO služby pre firmy na Slovensku</title></head><body><h1>SEO</h1>${"A".repeat(50_000)}</body></html>`;
    const result = await crawl(
      "https://mojweb.sk/",
      {
        "https://mojweb.sk/robots.txt": ok("User-agent: *\nAllow: /\n", "text/plain"),
        "https://mojweb.sk/sitemap.xml": ok("no", "text/html", 404),
        "https://mojweb.sk/sitemap_index.xml": ok("no", "text/html", 404),
        "https://mojweb.sk/": ok(huge),
      },
      { maxBytes: 2_000 },
    );
    expect(result.crawledCount).toBe(1);
    expect(result.pages[0]!.status).toBe(200);
  });
});
