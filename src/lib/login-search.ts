import { safeRedirect } from "@/lib/safe-auth-redirect";

export type LoginMode = "signin" | "signup";

export type LoginSearch = {
  redirect: string;
  mode?: "signup";
};

/** Accepts only ?mode=signup; any other value falls back to sign-in. */
export function parseLoginMode(value: unknown): LoginMode {
  return value === "signup" ? "signup" : "signin";
}

export function parseLoginSearch(search: Record<string, unknown>): LoginSearch {
  const redirect = safeRedirect(search.redirect);
  return parseLoginMode(search.mode) === "signup" ? { redirect, mode: "signup" } : { redirect };
}
