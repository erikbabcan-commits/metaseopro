import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { checkRateLimit } from "@/lib/rate-limit.server";
import { runDecayAlertSweep, type DecayAlertScope } from "@/lib/decay-alerts.server";
import { requireUser } from "@/lib/api-auth.server";
import { assertUserPropertyAccess } from "@/lib/gsc.server";
import { safeErrorForLog } from "@/lib/log-redact";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/api/public/cron-decay-alerts")({
  server: {
    handlers: {
      GET: async ({ request }) => handleCron(request),
      POST: async ({ request }) => handleCron(request),
    },
  },
});

async function handleCron(request: Request): Promise<Response> {
  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  // Rate limit: max 10 requests per minute
  const rl = checkRateLimit(`cron-decay-alerts:${clientIp}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(rl.retryAfterSec),
      },
    });
  }

  // Authorization: either the system CRON_SECRET (all users) or an authenticated user (own properties only).
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const xCronSecret = request.headers.get("x-cron-secret");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");

  const providedSecret =
    authHeader?.replace(/^Bearer\s+/i, "").trim() || xCronSecret?.trim() || querySecret?.trim();

  const isSystemRun = Boolean(
    expectedSecret && providedSecret && providedSecret === expectedSecret,
  );

  let scope: DecayAlertScope | undefined;
  if (!isSystemRun) {
    // Anyone else must be a signed-in user; the trigger is then limited to their own properties.
    const auth = await requireUser(request);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    scope = {
      userId: auth.userId,
      authorizeProperty: (siteUrl) =>
        assertUserPropertyAccess(auth.userId, siteUrl, auth.email, {
          email_verified: auth.emailVerified,
          email_confirmed_at: auth.emailConfirmedAt,
        }),
    };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Supabase connection unavailable" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const result = await runDecayAlertSweep({ supabase, scope });
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Cron decay alerts uncaught error:", safeErrorForLog(err));
    return new Response(JSON.stringify({ error: "Internal processing error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
