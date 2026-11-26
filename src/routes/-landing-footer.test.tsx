import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { LandingFooter } from "@/components/landing/LandingFooter";

const FORBIDDEN = ["Status systému", "Všetky systémy v prevádzke", "Googlebot API", "28ms"];

async function renderFooter(): Promise<string> {
  const rootRoute = createRootRoute({ component: () => <LandingFooter /> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  return renderToString(<RouterProvider router={router} />);
}

describe("LandingFooter does not show a fabricated system status", () => {
  it("omits the hardcoded status copy from the footer source", () => {
    const source = readFileSync(resolve("src/components/landing/LandingFooter.tsx"), "utf8");
    for (const phrase of FORBIDDEN) {
      expect(source).not.toContain(phrase);
    }
  });

  it("does not render the fabricated status in the footer HTML", async () => {
    const html = await renderFooter();
    for (const phrase of FORBIDDEN) {
      expect(html).not.toContain(phrase);
    }
  });
});
