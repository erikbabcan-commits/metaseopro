-- Append-only migration. Not applied by this PR: apply it on deploy.
-- Fixes Lovable finding "Any signed-in user can check another user's plan status".
--
-- Root cause: public.has_agency_plan(_user_id uuid) is SECURITY DEFINER (bypasses the
-- "Users view own subscription" RLS on public.subscriptions) and EXECUTE is granted to
-- `authenticated` (drizzle/migrations/0003_harden_usage_and_agency.sql:5-12, body re-created
-- in supabase/migrations/20261116031733_stripe_billing_reconciliation.sql:433-444).
-- Any signed-in user can therefore call
--   POST /rest/v1/rpc/has_agency_plan {"_user_id":"<victim uuid>"}
-- and learn whether any other user has an active agency subscription.
--
-- Fix: the helper answers only for the caller's own id. The agency_profiles RLS policies
-- call it as has_agency_plan(auth.uid()), so they keep working unchanged. For any other id
-- (or no session) it returns false, the same answer as "no agency plan", so it leaks nothing.
-- Signature, SECURITY DEFINER and search_path are preserved, no table or policy changes.
BEGIN;
DO $migration$
BEGIN
  IF to_regprocedure('public.has_agency_plan(uuid)') IS NOT NULL THEN
    EXECUTE $definition$
      CREATE OR REPLACE FUNCTION public.has_agency_plan(_user_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $body$
        SELECT COALESCE(_user_id = (SELECT auth.uid()), false)
          AND EXISTS (SELECT 1 FROM public.subscriptions
            WHERE user_id=_user_id AND plan='agency' AND status IN ('active','trialing')
              AND current_period_end>now())
      $body$
    $definition$;
    REVOKE EXECUTE ON FUNCTION public.has_agency_plan(uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.has_agency_plan(uuid) TO authenticated;
  END IF;
END
$migration$;
COMMIT;
