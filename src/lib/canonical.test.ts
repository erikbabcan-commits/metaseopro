import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalForMatches, canonicalForPath } from "@/lib/canonical";

const SITE = "https://seo.vorkei.com";

describe("canonicalForPath", () => {
  it.each([
    ["/", SITE],
    ["/audit", `${SITE}/audit`],
    ["/login/", `${SITE}/login`],
    ["/blog/a%20b", `${SITE}/blog/a%20b`],
    ["/audit?domain=x.sk#top", `${SITE}/audit`],
  ])("%s -> %s", (input, expected) => {
    expect(canonicalForPath(input, SITE)).toBe(expected);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "//evil.example/x",
    "https://evil.example/x",
    "/\\evil.example",
    "",
    "audit",
    undefined,
    null,
  ])("rejects %s", (input) => {
    expect(canonicalForPath(input as string, SITE)).toBeNull();
  });
});

describe("canonicalForMatches", () => {
  it("uses the deepest match pathname", () => {
    expect(canonicalForMatches([{ pathname: "/" }, { pathname: "/cennik" }], SITE)).toBe(
      `${SITE}/cennik`,
    );
  });
  it("emits no canonical for not-found or error matches", () => {
    expect(canonicalForMatches([{ pathname: "/", _notFound: true }], SITE)).toBeNull();
    expect(
      canonicalForMatches([{ pathname: "/" }, { pathname: "/x", status: "notFound" }], SITE),
    ).toBeNull();
    expect(
      canonicalForMatches([{ pathname: "/" }, { pathname: "/x", status: "error" }], SITE),
    ).toBeNull();
    expect(canonicalForMatches([], SITE)).toBeNull();
  });
});

describe("__root.tsx wiring", () => {
  const root = readFileSync(resolve(process.cwd(), "src/routes/__root.tsx"), "utf8");
  it("no longer hard-codes the homepage as canonical", () => {
    expect(root).not.toMatch(/rel:\s*"canonical",\s*href:\s*SITE\s*}/);
    expect(root).toContain("canonicalForMatches(matches)");
  });
});
