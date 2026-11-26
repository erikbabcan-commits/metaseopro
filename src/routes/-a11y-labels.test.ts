import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every form control must have an accessible name: either aria-label,
 * an id referenced by a <label htmlFor>, or be nested inside a <label>.
 */
function unlabeledControls(source: string): string[] {
  const htmlFor = new Set([...source.matchAll(/htmlFor="([^"]+)"/g)].map((m) => m[1]));
  const problems: string[] = [];
  const re = /<(input|textarea|select)\b([\s\S]*?)\/?>/g;
  for (const m of source.matchAll(re)) {
    const attrs = m[2];
    if (/type="(hidden|submit|button)"/.test(attrs)) continue;
    if (/aria-label(ledby)?=/.test(attrs)) continue;
    const id = /\bid="([^"]+)"/.exec(attrs)?.[1];
    if (id && htmlFor.has(id)) continue;
    const before = source.slice(0, m.index);
    const lastOpen = before.lastIndexOf("<label");
    const lastClose = before.lastIndexOf("</label>");
    if (lastOpen > lastClose) continue; // wrapped in <label>
    const line = before.split("\n").length;
    problems.push(`${m[1]} at line ${line}`);
  }
  return problems;
}

describe("form controls have accessible names", () => {
  it.each([
    "src/routes/serplab.tsx",
    "src/components/landing/LandingPricing.tsx",
    "src/components/landing/LandingHero.tsx",
  ])("%s", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(unlabeledControls(source)).toEqual([]);
  });

  it("detector flags an unlabeled input (self-check)", () => {
    expect(unlabeledControls('<div><input type="text" value={x} /></div>')).toHaveLength(1);
  });
});
