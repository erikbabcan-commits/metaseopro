import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { faqData } from "@/components/landing/faq-data";
import { checkoutPlanLabel } from "@/lib/billing-ui";
import {
  AGENCY_PRICE_EUR,
  AGENCY_PUBLIC,
  AUDIT_PASS_PRICE_EUR,
  PRO_PRICE_EUR,
  STRIPE_PAYMENT_LINK_AMOUNTS,
  TRIAL_DAYS,
  VAT_NOTE,
} from "@/lib/pricing";
import { AUDIT_PASS_PRICE, PLANS } from "@/lib/slovak-billing";

/**
 * What the live Stripe Payment Links charge (read from the hosted pages on 2026-11-26):
 *  - PRO_DIRECT_CHECKOUT_URL  -> "29,00 € za mesiac"
 *  - AUDIT_PASS_CHECKOUT_URL  -> "99,00 €" (one-time)
 * Kept as independent literals on purpose: if someone edits pricing.ts the test must fail.
 */
const LIVE_PAYMENT_LINK = { proMonthlyEur: 29, auditPassOneTimeEur: 99 };

async function renderLanding(): Promise<string> {
  const rootRoute = createRootRoute({ component: () => <LandingPricing /> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  return renderToString(<RouterProvider router={router} />);
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.|\.gen\./.test(name)) out.push(full);
  }
  return out;
}

describe("public prices match what Stripe charges", () => {
  it("pricing constants equal the live Payment Link amounts", () => {
    expect(PRO_PRICE_EUR).toBe(LIVE_PAYMENT_LINK.proMonthlyEur);
    expect(AUDIT_PASS_PRICE_EUR).toBe(LIVE_PAYMENT_LINK.auditPassOneTimeEur);
    expect(STRIPE_PAYMENT_LINK_AMOUNTS.pro).toEqual({
      amountEur: LIVE_PAYMENT_LINK.proMonthlyEur,
      interval: "month",
    });
    expect(STRIPE_PAYMENT_LINK_AMOUNTS.auditPass).toEqual({
      amountEur: LIVE_PAYMENT_LINK.auditPassOneTimeEur,
      interval: "one_time",
    });
  });

  it("checkout configuration (PLANS / AUDIT_PASS_PRICE) uses the same amounts as the UI", () => {
    expect(PLANS.pro.priceMonthly).toBe(PRO_PRICE_EUR);
    expect(AUDIT_PASS_PRICE).toBe(AUDIT_PASS_PRICE_EUR);
    expect(checkoutPlanLabel("pro")).toBe(
      `SEO4WEB Pro (${PLANS.pro.priceMonthly} € / mesiac ${VAT_NOTE})`,
    );
  });

  it("has no trial and keeps Agency hidden until it has a Stripe price", () => {
    expect(TRIAL_DAYS).toBe(0);
    expect(AGENCY_PUBLIC).toBe(false);
    expect(AGENCY_PRICE_EUR).toBeNull();
    expect(checkoutPlanLabel("agency")).not.toMatch(/€/);
  });

  it("landing pricing shows only Pro 29 €/mes. and Audit Pass 99 € incl. VAT, no trial, no Agency", async () => {
    const html = (await renderLanding()).replace(/<!-- -->/g, "");
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toContain("29 €");
    expect(text).toContain("/ mesiac vrátane DPH");
    expect(text).toContain("99 €");
    expect(text).toContain("jednorazovo vrátane DPH");
    expect(text).not.toMatch(/Agency/i);
    expect(text).not.toMatch(/dní zadarmo|trial|skúšobn/i);
    expect(text).not.toMatch(/\b(19|39|49|89|110|290)\s*€/);
    expect(text).not.toMatch(/bez DPH|za (ďalšiu )?stránku/i);
    const prices = [...text.matchAll(/(\d[\d\s]*)\s*€/g)].map((m) =>
      Number(m[1].replace(/\s/g, "")),
    );
    expect(new Set(prices)).toEqual(new Set([0, PRO_PRICE_EUR, AUDIT_PASS_PRICE_EUR]));
  });

  it("FAQ (and its JSON-LD source) quotes the same amounts and no trial", () => {
    const text = faqData.map((f) => f.answer).join(" ");
    expect(text).toContain(`${PRO_PRICE_EUR} €`);
    expect(text).toContain(`${AUDIT_PASS_PRICE_EUR} €`);
    expect(text).not.toMatch(/dní zadarmo|trial|bez DPH/i);
  });
});

describe("no stale prices remain in the source (rg-style check)", () => {
  const files = sourceFiles(resolve("src"));
  const read = (f: string) => readFileSync(f, "utf8");

  // Stale/unsupported public amounts and wording (pricing contexts).
  const STALE: Array<[string, RegExp]> = [
    ["stale amount 39/49/89/110/290 €", /\b(39|49|89|110|290)(,00)?\s*(?:€|EUR\b)/],
    ["99 € + 39 € per-site model", /\+\s*39\s*€|za (ďalšiu )?stránku/i],
    [
      "trial claim",
      /\b(14|30)[- ]?(dní|dňov\w*)\s+(zadarmo|trial)|dní zadarmo|free trial|skúšobn\w+ (doba|obdob)/i,
    ],
    ["excl. VAT wording", /bez DPH/i],
    ["unfulfilled Audit Pass Pro month", /1 mesiac (balíka )?Pro v cene/i],
    ["upsell 'Pro alebo Agency'", /Pro alebo Agency/],
  ];

  it.each(STALE)("no %s in src (non-test)", (_label, re) => {
    const hits = files
      .filter((f) => !f.endsWith("src/lib/pricing.ts"))
      .flatMap((f) =>
        read(f)
          .split("\n")
          .map((line, i) => ({ f, i: i + 1, line }))
          .filter(({ line }) => re.test(line)),
      );
    expect(
      hits.map((h) => `${h.f.replace(resolve("src") + "/", "")}:${h.i}: ${h.line.trim()}`),
    ).toEqual([]);
  });

  it("FAQ and footer do not claim a live crawler", () => {
    for (const rel of [
      "src/components/landing/faq-data.ts",
      "src/components/landing/LandingFooter.tsx",
    ]) {
      const text = read(resolve(rel));
      expect(text, rel).not.toMatch(/live\s+crawler/i);
    }
  });

  it("Agency marketing copy in settings.agency is behind AGENCY_PUBLIC", () => {
    const src = read(resolve("src/routes/settings.agency.tsx"));
    const banner = src.match(
      /\{AGENCY_PUBLIC && userPlan && !isAgencyPlan && !isAdmin && \([\s\S]*?\)\}/,
    );
    expect(banner, "upsell banner must be gated by AGENCY_PUBLIC").toBeTruthy();
    expect(banner![0]).toMatch(/exkluzívna funkcia balíka Agency/);
    // The same marketing line must not appear outside that gated block.
    const elsewhere = src.replace(banner![0], "");
    expect(elsewhere).not.toMatch(
      /exkluzívna funkcia balíka Agency|Balík Agency zatiaľ nie je v predaji/,
    );
  });

  it("plan prices 29 € / 99 € are written only in pricing.ts (everything else imports it)", () => {
    const literal = /(?<![\d,.])(29|99)(,00)?\s*(?:€|EUR\b)/;
    const hits = files
      .filter((f) => !f.endsWith("src/lib/pricing.ts"))
      .flatMap((f) =>
        read(f)
          .split("\n")
          .map((line, i) => ({ f, i: i + 1, line }))
          .filter(({ line }) => literal.test(line)),
      );
    expect(
      hits.map((h) => `${h.f.replace(resolve("src") + "/", "")}:${h.i}: ${h.line.trim()}`),
    ).toEqual([]);
  });
});
