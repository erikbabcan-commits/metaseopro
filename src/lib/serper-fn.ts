import { createServerFn } from "@tanstack/react-start";
import type { SerperOrganicResult } from "./serper.server";

export interface LiveSerpLookupResult {
  query: string;
  organic: SerperOrganicResult[];
}

export const fetchLiveSerpFn = createServerFn({ method: "POST" })
  .validator((input: { query: string; num?: number }) => {
    const query = typeof input?.query === "string" ? input.query.trim() : "";
    if (!query) {
      throw new Error("Zadajte kľúčové slovo");
    }
    const num = typeof input?.num === "number" ? Math.min(Math.max(input.num, 1), 10) : 5;
    return { query, num };
  })
  .handler(async ({ data }): Promise<LiveSerpLookupResult> => {
    const { searchSerper } = await import("./serper.server");
    const response = await searchSerper(data.query, {
      gl: "sk",
      hl: "sk",
      num: data.num,
    });
    return {
      query: data.query,
      organic: response.organic ?? [],
    };
  });
