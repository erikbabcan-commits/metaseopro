import { safeRedirect, saveAuthRedirect } from "@/lib/safe-auth-redirect";

export type LoginMode = "signin" | "signup";

export type LoginSearch = {
  redirect?: string;
  next?: string;
  mode?: "signup";
};

/** Accepts only ?mode=signup; any other value falls back to sign-in. */
export function parseLoginMode(value: unknown): LoginMode {
  return value === "signup" ? "signup" : "signin";
}

function parseSafePath(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? safeRedirect(value) : undefined;
}

export function parseLoginSearch(search: Record<string, unknown>): LoginSearch {
  // Only an explicit ?next= or ?redirect= is kept; absent means "no preference"
  // (do not overwrite a saved target). ?next is the CTA alias; ?redirect stays
  // for existing callers. Both are sanitized with safeRedirect (relative "/" only, never "//").
  const next = parseSafePath(search.next);
  const redirect = parseSafePath(search.redirect);
  const base: LoginSearch = {};
  if (next) base.next = next;
  if (redirect) base.redirect = redirect;
  return parseLoginMode(search.mode) === "signup" ? { ...base, mode: "signup" } : base;
}

/** Post-login target: ?next= wins over ?redirect= when both are present. */
export function loginDestination(
  search: Pick<LoginSearch, "next" | "redirect">,
): string | undefined {
  return search.next ?? search.redirect;
}

/** Rebuilds login search while toggling mode, preserving next/redirect. */
export function loginSearchForMode(search: LoginSearch, mode: LoginMode): LoginSearch {
  const out: LoginSearch = {};
  if (search.next) out.next = search.next;
  if (search.redirect) out.redirect = search.redirect;
  if (mode === "signup") out.mode = "signup";
  return out;
}

/**
 * Stores the explicit ?next= or ?redirect= for after sign-in (sticky-redirect fix 46da7b7).
 * - explicit destination: overwrites any older saved target;
 * - absent/empty (parseLoginSearch yields undefined): keeps the saved target (e.g. the landing audit).
 */
export function rememberLoginRedirect(redirect: string | undefined): void {
  if (redirect) saveAuthRedirect(redirect);
}
