import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { LandingFooter } from "./LandingFooter";
import { parseLoginSearch } from "@/lib/login-search";

async function renderFooter(): Promise<string> {
  const rootRoute = createRootRoute({ component: () => <LandingFooter /> });
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    validateSearch: parseLoginSearch,
  });
  const auditRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/audit",
  });
  const decayRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/decay",
  });
  const raketaRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/raketa",
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([loginRoute, auditRoute, decayRoute, raketaRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  return renderToString(<RouterProvider router={router} />);
}

function auditCta(html: string): string {
  const match = html.match(/<a\b[^>]*>[\s\S]*?Začať bezplatný audit teraz[\s\S]*?<\/a>/);
  if (!match) throw new Error("audit CTA link not found");
  return match[0];
}

function hrefOf(anchor: string): string {
  const match = anchor.match(/href="([^"]*)"/);
  if (!match) throw new Error("href missing on audit CTA");
  return match[1].replace(/&amp;/g, "&");
}

describe("LandingFooter free-audit CTA", () => {
  it('points "Začať bezplatný audit teraz" at /login?next=/audit', async () => {
    const href = hrefOf(auditCta(await renderFooter()));
    const url = new URL(href, "https://seo.vorkei.com");
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe("/audit");
    expect(url.searchParams.has("redirect")).toBe(false);
  });

  it("does not leave that CTA as a scroll-to-top button", async () => {
    const html = await renderFooter();
    expect(html).not.toMatch(/<button[^>]*>[\s\S]*Začať bezplatný audit teraz/);
  });
});
