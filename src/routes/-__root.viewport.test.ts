import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function viewportContent(source: string): string {
  const match = source.match(/name:\s*"viewport"\s*,\s*content:\s*"([^"]+)"/);
  if (!match) {
    throw new Error("viewport meta content not found in src/routes/__root.tsx");
  }
  return match[1];
}

describe("root viewport meta (WCAG 1.4.4 pinch-zoom)", () => {
  const content = viewportContent(readFileSync(resolve("src/routes/__root.tsx"), "utf8"));

  it("keeps width=device-width and does not lock zoom", () => {
    expect(content).toContain("width=device-width");
    expect(content.toLowerCase()).not.toMatch(/maximum-scale/);
    expect(content.toLowerCase()).not.toMatch(/user-scalable\s*=\s*no/);
  });
});
