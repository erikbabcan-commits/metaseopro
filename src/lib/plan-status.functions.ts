import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolvePlanStatusTarget, toPlanStatus, type PlanStatus } from "./plan-status.server";

// Unknown keys are rejected (no mass assignment); userId is optional and is
// only an authorization question, never a source of identity.
const PlanStatusInputSchema = z
  .object({ userId: z.string().uuid().optional() })
  .strict()
  .optional();

/**
 * Plan status for the verified session user. This is the sanctioned way to ask
 * "does this user have the agency plan" from app code; the database helper
 * public.has_agency_plan(uuid) must never be called with a client-chosen id.
 */
export const getPlanStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => PlanStatusInputSchema.parse(input) ?? {})
  .handler(async ({ data, context }): Promise<PlanStatus> => {
    const targetUserId = resolvePlanStatusTarget(context.userId, data.userId);
    // Own plan: RLS-scoped client ("Users view own subscription").
    // Another user's plan is only reachable for an ID-based superadmin.
    const client =
      targetUserId === context.userId
        ? context.supabase
        : (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    try {
      const { data: row, error } = await client
        .from("subscriptions")
        .select("plan, status, current_period_end")
        .eq("user_id", targetUserId)
        .maybeSingle();
      if (error) throw error;
      return toPlanStatus(targetUserId, row);
    } catch {
      throw new Error("PLAN_STATUS_UNAVAILABLE");
    }
  });
