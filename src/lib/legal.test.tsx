import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import {
  LEGAL,
  LEGAL_MAILTO,
  LEGAL_PATHS,
  PLACEHOLDER_MARK,
  hasLegalPlaceholders,
} from "@/lib/legal";
import { CookiesContent, PrivacyContent, TermsContent } from "@/components/legal/LegalContent";

const read = (p: string) => readFileSync(resolve(p), "utf-8");

describe("legal operator constant", () => {
  it("has every operator field as an explicit TODO-ERIK placeholder (no invented data)", () => {
    for (const key of ["name", "address", "ico", "dic", "email"] as const) {
      expect(LEGAL[key], key).toContain(PLACEHOLDER_MARK);
    }
    expect(hasLegalPlaceholders()).toBe(true);
  });

  it("builds the mailto link from the same constant", () => {
    expect(LEGAL_MAILTO).toBe(`mailto:${LEGAL.email}`);
  });
});

describe("LandingFooter legal links", () => {
  const footer = read("src/components/landing/LandingFooter.tsx");

  it("points legal links to the new pages and Kontakt to the mailto constant", () => {
    expect(LEGAL_PATHS).toEqual({
      terms: "/obchodne-podmienky",
      privacy: "/ochrana-osobnych-udajov",
      cookies: "/cookies",
    });
    expect(footer).toMatch(/to=\{LEGAL_PATHS\.terms\}\s*>\s*Podmienky používania/);
    expect(footer).toMatch(/to=\{LEGAL_PATHS\.privacy\}\s*>\s*Ochrana osobných údajov/);
    expect(footer).toMatch(/to=\{LEGAL_PATHS\.cookies\}\s*>\s*Cookies nastavenia/);
    expect(footer).toMatch(/href=\{LEGAL_MAILTO\}>\s*Kontakt/);
  });

  it('no longer has dead href="#" links', () => {
    expect(footer).not.toContain('href="#"');
  });
});

describe("legal routes", () => {
  const routes = [
    ["src/routes/obchodne-podmienky.tsx", "/obchodne-podmienky"],
    ["src/routes/ochrana-osobnych-udajov.tsx", "/ochrana-osobnych-udajov"],
    ["src/routes/cookies.tsx", "/cookies"],
  ] as const;

  it.each(routes)("%s registers %s with title and description meta", (file, path) => {
    const src = read(file);
    expect(src).toContain(`createFileRoute("${path}")`);
    expect(src).toMatch(/title: ".+ \| SEO4WEB"/);
    expect(src).toContain('name: "description"');
    expect(src).toContain("LegalLayout");
  });

  it("layout has a back link to / ", () => {
    const layout = read("src/components/legal/LegalLayout.tsx");
    expect(layout).toContain('to="/"');
    expect(layout).toContain("Späť");
  });
});

describe("legal page content", () => {
  it("terms and privacy render the operator placeholders and the mailto", () => {
    for (const C of [TermsContent, PrivacyContent, CookiesContent]) {
      const html = renderToStaticMarkup(<C />);
      expect(html).toContain(`href="${LEGAL_MAILTO}"`);
    }
    for (const C of [TermsContent, PrivacyContent]) {
      const html = renderToStaticMarkup(<C />);
      expect(html).toContain(LEGAL.name);
      expect(html).toContain(LEGAL.ico);
      expect(html).toContain(LEGAL.dic);
      expect(html).toContain(LEGAL.address);
    }
  });

  it("privacy names the real processors and GDPR rights", () => {
    const html = renderToStaticMarkup(<PrivacyContent />);
    for (const word of ["Supabase", "Stripe", "Mistral", "Semrush", "čl. 6 ods. 1", "prístup"]) {
      expect(html).toContain(word);
    }
  });

  it("cookies page lists only storage the app really uses", () => {
    const html = renderToStaticMarkup(<CookiesContent />);
    expect(html).toContain("locale");
    expect(html).toContain("seo4web:auth-redirect");
    expect(html).toContain("seo4web_ios_prompt_dismissed");
    expect(html).not.toMatch(/_ga|_gid|fbp|hotjar/i);
    // keys must still exist in the code base
    expect(read("src/lib/i18n.ts")).toContain("locale=");
    expect(read("src/lib/safe-auth-redirect.ts")).toContain("seo4web:auth-redirect");
    expect(read("src/components/IosInstallPrompt.tsx")).toContain("seo4web_ios_prompt_dismissed");
  });
});
