// Server-only: on-page fallback for /api/audit-domains when no Semrush key is configured.
// Uses the existing SSRF-guarded analyzePage() (real fetch + parse, never mocked data).
import type { PageAnalysis } from "@/lib/raketa-schema";
import { AnalyzeError, analyzePage } from "@/lib/site-analyze.server";

export type OnPageDomainResult =
  | { domain: string; url: string; ok: true; page: PageAnalysis }
  | { domain: string; url: string; ok: false; error: string };

/** True only when a non-empty SEMRUSH_API_KEY is present. */
export function isSemrushConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return typeof env.SEMRUSH_API_KEY === "string" && env.SEMRUSH_API_KEY.trim().length > 0;
}

export const ONPAGE_MODE_NOTICE =
  "> **Režim on-page auditu:** Dáta zo Semrush (návštevnosť, kľúčové slová, spätné odkazy) " +
  "nie sú pre tento účet k dispozícii. Audit vychádza iba z verejne dostupného obsahu úvodnej " +
  "stránky každej domény (title, meta description, nadpisy, CTA, rozsah textu).\n\n";

export async function collectOnPageData(
  domains: string[],
  analyze: (url: string) => Promise<PageAnalysis> = analyzePage,
): Promise<OnPageDomainResult[]> {
  return Promise.all(
    domains.map(async (domain): Promise<OnPageDomainResult> => {
      const url = `https://${domain}/`;
      try {
        const page = await analyze(url);
        return { domain, url, ok: true, page };
      } catch (e) {
        const error =
          e instanceof AnalyzeError ? e.message : "Web sa nepodarilo načítať (neznáma chyba).";
        return { domain, url, ok: false, error };
      }
    }),
  );
}

/** One OpenAI-compatible SSE event carrying `text` as a delta (parsed by src/lib/stream-sse.ts). */
export function sseDeltaEvent(text: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
}

/** Emits `prefix` as its own SSE event, then passes the upstream SSE body through unchanged. */
export function prependSseText(
  prefix: string,
  upstream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const reader = upstream.getReader();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(sseDeltaEvent(prefix)));
    },
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
