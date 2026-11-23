import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppHeader } from "./AppHeader";

async function renderHeader(): Promise<string> {
  const rootRoute = createRootRoute({ component: () => <AppHeader /> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  return renderToString(<RouterProvider router={router} />);
}

function logoLink(html: string): string {
  const match = html.match(/<a\b[^>]*href="\/"[^>]*>[\s\S]*?<\/a>/);
  if (!match) throw new Error("logo link not found");
  return match[0];
}

function visibleText(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("AppHeader logo accessible name (WCAG 2.5.3, axe label-content-name-mismatch)", () => {
  it("takes its accessible name from the visible text, not a differing aria-label", async () => {
    const link = logoLink(await renderHeader());
    const openTag = link.slice(0, link.indexOf(">") + 1);

    expect(visibleText(link)).toBe("SEO4WEB AI SEO Command Center");
    // No aria-label: the accessible name is computed from the visible text, so it can't drift.
    expect(openTag).not.toContain("aria-label");
  });

  it("keeps the brand name as the first visible word (mobile hides the tagline)", async () => {
    const text = visibleText(logoLink(await renderHeader()));
    expect(text.startsWith("SEO4WEB")).toBe(true);
  });
});
