import { createFileRoute } from "@tanstack/react-router";
import { AnalyzeDecaySchema } from "@/lib/decay-schema";
import { buildLiveDataset, runDecayAnalysis } from "@/lib/decay-analyze.server";
import { isGscConfigured } from "@/lib/gsc.server";
import { requireUser } from "@/lib/api-auth.server";
import { checkViewerRateLimit } from "@/lib/viewer-role.server";
import { saveDecaySnapshot } from "@/lib/snapshots.server";
import { readBoundedBytes, BodyTooLargeError } from "@/lib/request-body.server";

const MAX_BODY_BYTES = 8 * 1024;

function err(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/decay-analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = await requireUser(request);
          if (!auth.ok) return auth.response;

          const contentLength = Number(request.headers.get("content-length") ?? "0");
          if (contentLength > MAX_BODY_BYTES) return err(413, "Vstup je príliš veľký.");

          const rl = checkViewerRateLimit({ id: auth.userId }, `decay-analyze:${auth.userId}`, {
            limit: 20,
            windowMs: 60_000,
          });
          if (!rl.ok) {
            return new Response(
              JSON.stringify({
                error: `Príliš veľa požiadaviek. Skús to o ${rl.retryAfterSec}s.`,
              }),
              {
                status: 429,
                headers: {
                  "Content-Type": "application/json",
                  "Retry-After": String(rl.retryAfterSec),
                },
              },
            );
          }

          let raw: unknown;
          try {
            raw = JSON.parse(
              new TextDecoder().decode(await readBoundedBytes(request, MAX_BODY_BYTES)),
            );
          } catch (error) {
            if (error instanceof BodyTooLargeError) return err(413, "Vstup je príliš veľký.");
            return err(400, "Neplatný JSON.");
          }
          const parsed = AnalyzeDecaySchema.safeParse(raw);
          if (!parsed.success) return err(400, "Neplatný vstup. Vyber demo scenár.");

          let dataset;
          if (parsed.data.mode === "live") {
            if (!parsed.data.siteUrl) return err(400, "Vyber overenú Search Console property.");
            if (!isGscConfigured())
              return err(409, "Google Search Console nie je pripojený. Použi demo režim.");
            try {
              dataset = await buildLiveDataset(auth.userId, parsed.data.siteUrl);
            } catch (e) {
              const msg = (e as Error).message;
              if (msg === "GSC_USER_UNAUTHORIZED_FOR_PROPERTY")
                return err(
                  403,
                  "K tejto Search Console doméne nemáte oprávnenie. Pripojte si vlastnú Search Console.",
                );
              if (msg === "GSC_PROPERTY_NOT_VERIFIED")
                return err(403, "Táto property nie je overená pre pripojený účet.");
              if (msg === "GSC_FORBIDDEN")
                return err(403, "Pripojený Google účet nemá prístup k tejto property.");
              console.error("Live decay analysis failed");
              return err(502, "Google Search Console nevrátilo dáta. Skús to znova.");
            }
          } else {
            dataset = await runDecayAnalysis(parsed.data.scenario);
          }
          let snapshotId: string | null = null;
          if (!dataset.demo) {
            snapshotId = await saveDecaySnapshot(request, auth.userId, dataset);
          }
          return new Response(JSON.stringify({ dataset, snapshotId }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("decay-analyze error:", e);
          return err(500, "Neočakávaná chyba pri analýze.");
        }
      },
    },
  },
});
