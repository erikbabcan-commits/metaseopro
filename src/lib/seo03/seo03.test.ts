import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  MAX_DATA_ROWS,
  MAX_FILE_BYTES,
  Seo03Error,
  assertFileSize,
  detectDelimiter,
  parseCsv,
  parseNumber,
} from "./csv";
import { localizePeriodLabel, parseCompareExport, parseTwoPeriodExports } from "./gsc-export";
import { buildHints, buildReportCsv, computeLosses, sanitizeCell } from "./analysis";
import { SAMPLE_GSC_COMPARE_CSV } from "./sample";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(join(here, "__fixtures__", name), "utf8");

function errorCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof Seo03Error ? e.code : `non-seo03:${String(e)}`;
  }
  return undefined;
}

describe("seo03 csv tokenizer", () => {
  it("handles quotes, escaped quotes, embedded delimiters/newlines, CRLF and BOM", () => {
    const rows = parseCsv('\uFEFFa,b,c\r\n"x, y","he said ""hi""","multi\nline"\r\n');
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["x, y", 'he said "hi"', "multi\nline"],
    ]);
  });

  it("detects comma, semicolon and tab delimiters from the header", () => {
    expect(detectDelimiter("a,b,c\n1;2;3;4;5")).toBe(",");
    expect(detectDelimiter('"a,b";c;d\n')).toBe(";");
    expect(detectDelimiter("a\tb\tc\n")).toBe("\t");
  });

  it("rejects an unterminated quote", () => {
    expect(errorCode(() => parseCsv('a,b\n"open,1\n'))).toBe("UNTERMINATED_QUOTE");
  });

  it("enforces the data row limit (header excluded)", () => {
    const ok = "h\n" + "1\n".repeat(5);
    expect(parseCsv(ok, { maxRows: 5 })).toHaveLength(6);
    expect(errorCode(() => parseCsv(ok + "1\n", { maxRows: 5 }))).toBe("TOO_MANY_ROWS");
    expect(MAX_DATA_ROWS).toBe(5000);
  });

  it("enforces the file size limit before reading", () => {
    expect(() => assertFileSize(MAX_FILE_BYTES)).not.toThrow();
    expect(errorCode(() => assertFileSize(MAX_FILE_BYTES + 1))).toBe("FILE_TOO_LARGE");
  });

  it("parses EN and SK number formats", () => {
    expect(parseNumber("1,234", true)).toBe(1234);
    expect(parseNumber("1 234", true)).toBe(1234);
    expect(parseNumber("1\u00a0234\u00a0567", true)).toBe(1234567);
    expect(parseNumber("4,49 %", false)).toBe(4.49);
    expect(parseNumber("4.49%", false)).toBe(4.49);
    expect(parseNumber("1.234,5", false)).toBe(1234.5);
    expect(parseNumber("n/a", true)).toBeNull();
    expect(parseNumber("", true)).toBeNull();
  });
});

describe("seo03 GSC export parsing", () => {
  it("parses the sample (EN compare export) with both periods", () => {
    const parsed = parseCompareExport(SAMPLE_GSC_COMPARE_CSV);
    expect(parsed.rows).toHaveLength(9);
    expect(parsed.periodLabels).toEqual({
      current: "Posledné 3 mesiace",
      previous: "Predchádzajúce 3 mesiace",
    });
    const shoes = parsed.rows.find((r) => r.page.endsWith("bezecke-topanky"))!;
    expect(shoes.current).toEqual({ clicks: 1120, impressions: 38500, ctr: 0.0291, position: 6.4 });
    expect(shoes.previous.clicks).toBe(1840);
  });

  it("parses a SK semicolon export and skips broken, empty and duplicate rows", () => {
    const parsed = parseCompareExport(fixture("sk-compare-broken.csv"));
    expect(parsed.rows.map((r) => r.page)).toEqual([
      "https://obchod.example/a",
      "https://obchod.example/b?x=1;y=2",
    ]);
    expect(parsed.skippedEmpty).toBe(2);
    expect(parsed.skippedInvalid).toBe(3);
    expect(parsed.skippedDuplicate).toBe(1);
    expect(parsed.rows[0].previous).toEqual({
      clicks: 1840,
      impressions: 41000,
      ctr: 0.0449,
      position: 3.1,
    });
    expect(parsed.periodLabels.previous).toBe("Predchádzajúce 3 mesiace");
  });

  it("orders periods by dates when headers carry date ranges", () => {
    const parsed = parseCompareExport(fixture("injection.csv"));
    expect(parsed.rows[0].previous.clicks).toBe(50);
    expect(parsed.rows[0].current.clicks).toBe(0);
  });

  it.each([
    ["empty.csv", "EMPTY_FILE"],
    ["header-only.csv", "EMPTY_FILE"],
    ["wrong-format-queries.csv", "WRONG_FORMAT"],
    ["single-current.csv", "SINGLE_PERIOD"],
  ])("rejects %s with %s", (name, code) => {
    expect(errorCode(() => parseCompareExport(fixture(name)))).toBe(code);
  });

  it("rejects a file where every data row is broken", () => {
    const text = "Top pages,Last 28 days Clicks,Previous 28 days Clicks\n,1,2\nx,a,b\n";
    expect(errorCode(() => parseCompareExport(text))).toBe("NO_VALID_ROWS");
  });

  it("localizes EN period labels to Slovak", () => {
    expect(localizePeriodLabel("Last 28 days")).toBe("Posledné 28 dní");
    expect(localizePeriodLabel("Previous 6 months")).toBe("Predchádzajúce 6 mesiacov");
    expect(localizePeriodLabel("2026-08-01 - 2026-08-28")).toBe("2026-08-01 - 2026-08-28");
  });

  it("rejects binary content", () => {
    expect(errorCode(() => parseCompareExport("PK\u0003\u0004\u0000\u0000"))).toBe("NOT_TEXT");
  });

  it("joins two single-period exports by page", () => {
    const parsed = parseTwoPeriodExports(
      fixture("single-current.csv"),
      fixture("single-previous.csv"),
    );
    const byPage = Object.fromEntries(parsed.rows.map((r) => [r.page, r]));
    expect(byPage["https://obchod.example/a"].previous.clicks).toBe(160);
    expect(byPage["https://obchod.example/a"].current.clicks).toBe(100);
    expect(byPage["https://obchod.example/b"].previous.clicks).toBe(0);
    expect(byPage["https://obchod.example/c"].current.clicks).toBe(0);
    expect(parsed.skippedEmpty).toBe(1);
    expect(parsed.skippedInvalid).toBe(1);
  });
});

describe("seo03 loss computation and hints", () => {
  it("returns the top 3 click losses with deltas from the sample", () => {
    const summary = computeLosses(parseCompareExport(SAMPLE_GSC_COMPARE_CSV));
    expect(
      summary.top.map((p) => [p.page.replace("https://obchod.example", ""), p.clickLoss]),
    ).toEqual([
      ["/kategoria/bezecke-topanky", 720],
      ["/produkt/zimna-bunda-x", 590],
      ["/blog/ako-vybrat-spacak", 470],
    ]);
    expect(summary.top[0].lossPct).toBeCloseTo(720 / 1840);
    expect(summary.top[0].positionChange).toBeCloseTo(3.3);
    expect(summary.pagesTotal).toBe(9);
    expect(summary.pagesWithLoss).toBe(7);
    expect(summary.totalClickLoss).toBe(720 + 590 + 470 + 40 + 2 + 35 + 40);
  });

  it("derives the first fix from the data", () => {
    const [shoes, jacket, blog] = computeLosses(parseCompareExport(SAMPLE_GSC_COMPARE_CSV)).top;
    expect(shoes.hints[0].kind).toBe("position");
    expect(jacket.hints[0].kind).toBe("ctr");
    expect(blog.hints[0].kind).toBe("demand");
  });

  it("flags pages that dropped out entirely and falls back to manual review", () => {
    const m = (
      clicks: number,
      impressions: number | null,
      ctr: number | null,
      position: number | null,
    ) => ({
      clicks,
      impressions,
      ctr,
      position,
    });
    expect(
      buildHints({ page: "x", previous: m(40, 900, 0.04, 12), current: m(0, 0, 0, 0) })[0].kind,
    ).toBe("lost");
    expect(
      buildHints({
        page: "x",
        previous: m(40, null, null, null),
        current: m(30, null, null, null),
      })[0].kind,
    ).toBe("manual");
    // 0 clicks without an impressions column is not proof the page dropped out.
    expect(
      buildHints({
        page: "x",
        previous: m(40, null, null, null),
        current: m(0, null, null, null),
      })[0].kind,
    ).toBe("manual");
  });

  it("handles no losses and fewer than 3 losing pages", () => {
    const rows = [
      {
        page: "a",
        previous: { clicks: 10, impressions: null, ctr: null, position: null },
        current: { clicks: 20, impressions: null, ctr: null, position: null },
      },
      {
        page: "b",
        previous: { clicks: 10, impressions: null, ctr: null, position: null },
        current: { clicks: 10, impressions: null, ctr: null, position: null },
      },
    ];
    expect(computeLosses({ rows }).top).toHaveLength(0);
    rows[1].current.clicks = 4;
    const s = computeLosses({ rows });
    expect(s.top).toHaveLength(1);
    expect(s.top[0].rank).toBe(1);
  });
});

describe("seo03 report export (formula injection)", () => {
  it.each(["=1+1", "+cmd", "-2+3", "@SUM(A1)", "\tx", "\rx"])("neutralizes %j", (v) => {
    expect(sanitizeCell(v)).toBe(`'${v}`);
  });

  it("leaves safe values unchanged", () => {
    expect(sanitizeCell("https://obchod.example/")).toBe("https://obchod.example/");
    expect(sanitizeCell("720")).toBe("720");
  });

  it("never emits a cell that starts with a formula trigger", () => {
    const csv = buildReportCsv(computeLosses(parseCompareExport(fixture("injection.csv")), 5));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const body = csv.slice(1).trim().split("\r\n");
    expect(body).toHaveLength(6);
    for (const line of body.slice(1)) {
      const cells = parseCsv(line, { delimiter: ";" })[0];
      for (const cell of cells) expect(cell).not.toMatch(/^[=+\-@\t\r]/);
    }
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.example"")"`);
    expect(csv).toContain("'+cmd");
    expect(csv).toContain("'-2+3");
    expect(csv).toContain("'@SUM(A1)");
  });

  it("quotes cells containing the delimiter", () => {
    const csv = buildReportCsv(computeLosses(parseCompareExport(fixture("sk-compare-broken.csv"))));
    expect(csv).toContain('"https://obchod.example/b?x=1;y=2"');
  });
});

describe("seo03 privacy: uploaded CSV is never stored or logged", () => {
  const sources = [
    ...readdirSync(here)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
      .map((f) => join(here, f)),
    join(here, "..", "..", "components", "Seo03Demo.tsx"),
    join(here, "..", "..", "routes", "demo.seo-03.tsx"),
  ];

  it.each(sources)("%s has no storage, network or console calls", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie|caches\./);
    expect(src).not.toMatch(/\bconsole\.|fetch\(|XMLHttpRequest|sendBeacon|supabase/);
  });
});
