import { createServerFn } from "@tanstack/react-start";
import type { PageSpeedReport, PageSpeedStrategy } from "./pagespeed.server";

export const runPageSpeedFn = createServerFn({ method: "POST" })
  .validator((input: { url: string; strategy?: PageSpeedStrategy }) => {
    const url = typeof input?.url === "string" ? input.url.trim() : "";
    if (!url) {
      throw new Error("Zadajte URL alebo doménu na meranie.");
    }
    const strategy: PageSpeedStrategy = input?.strategy === "desktop" ? "desktop" : "mobile";
    return { url, strategy };
  })
  .handler(async ({ data }): Promise<PageSpeedReport> => {
    const { fetchPageSpeedReport } = await import("./pagespeed.server");
    return fetchPageSpeedReport(data.url, data.strategy);
  });
