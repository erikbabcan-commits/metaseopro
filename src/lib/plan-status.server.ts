// Server-only plan status resolution. The plan of a user is private billing
// data: a caller may only read their own plan. A different user id is accepted
// only for a superadmin, and superadmin is decided solely by isAdminUser() with
// the verified session user id (ADMIN_USER_IDS). Email, user_metadata and
// app_metadata are never consulted here.
import { isAdminUser } from "./admin.server";
import { getEffectivePlan, type SubscriptionAccessRecord } from "./billing-policy";
import type { PlanId } from "./slovak-billing";

export type PlanStatusErrorCode = "UNAUTHORIZED" | "FORBIDDEN";

export class PlanStatusAccessError extends Error {
  readonly code: PlanStatusErrorCode;
  readonly status: 401 | 403;

  constructor(code: PlanStatusErrorCode) {
    super(code === "UNAUTHORIZED" ? "PLAN_STATUS_UNAUTHORIZED" : "PLAN_STATUS_FORBIDDEN");
    this.name = "PlanStatusAccessError";
    this.code = code;
    this.status = code === "UNAUTHORIZED" ? 401 : 403;
  }
}

/**
 * Returns the user id whose plan may be read. Deny by default:
 * - no verified session user -> 401 UNAUTHORIZED;
 * - no requested id, or the session user's own id -> the session user;
 * - any other id -> only for an ID-based superadmin, otherwise 403 FORBIDDEN.
 */
export function resolvePlanStatusTarget(
  sessionUserId: string | null | undefined,
  requestedUserId?: string | null,
): string {
  if (!sessionUserId) throw new PlanStatusAccessError("UNAUTHORIZED");
  if (!requestedUserId || requestedUserId === sessionUserId) return sessionUserId;
  // Identity is passed as id only, so no email-based fallback can apply.
  if (isAdminUser({ id: sessionUserId })) return requestedUserId;
  throw new PlanStatusAccessError("FORBIDDEN");
}

export interface PlanStatus {
  userId: string;
  plan: PlanId;
  hasAgencyPlan: boolean;
}

export function toPlanStatus(
  userId: string,
  subscription: SubscriptionAccessRecord | null | undefined,
  now: number = Date.now(),
): PlanStatus {
  const plan = getEffectivePlan(subscription, now);
  return { userId, plan, hasAgencyPlan: plan === "agency" };
}
