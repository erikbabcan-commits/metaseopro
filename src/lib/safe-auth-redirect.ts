/**
 * Safe auth redirect helpers (AUD OAuth fix).
 * - appOrigin(): current app origin, with the published Lovable app as the server fallback.
 * - safeRedirect(): only relative same-origin paths — blocks open redirects.
 * - sessionStorage-backed post-login redirect (survives the OAuth broker round-trip).
 * No tokens are ever read from or written to the URL.
 */

export const DEFAULT_APP_ORIGIN = "https://seo4web.lovable.app";
const REDIRECT_STORAGE_KEY = "seo4web:auth-redirect";
const DEFAULT_REDIRECT = "/dashboard";
// eslint-disable-next-line no-control-regex -- intentionally matches C0 controls and DEL
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

/**
 * True when the path points at /login (loop guard). Case-insensitive, evaluated on the
 * percent-decoded pathname (decoded up to 3 times, so "/%6cogin" and "/%256cogin" match),
 * with "." / ".." / empty segments resolved. A malformed escape cannot be evaluated,
 * so it counts as a match and the caller rejects it.
 */
function isLoginLoopPath(path: string): boolean {
  let decoded = path.split(/[?#]/, 1)[0];
  for (let i = 0; i < 3; i += 1) {
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      return true;
    }
    if (next === decoded) break;
    decoded = next;
  }
  const stack: string[] = [];
  for (const segment of decoded.replace(/\\/g, "/").split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") stack.pop();
    else stack.push(segment);
  }
  return (stack[0] ?? "").toLowerCase().startsWith("login");
}

export function appOrigin(): string {
  if (typeof window !== "undefined") {
    const origin = window.location?.origin;
    if (origin && origin !== "null") return origin;
  }
  return DEFAULT_APP_ORIGIN;
}

/**
 * Returns a safe relative same-origin path, or DEFAULT_REDIRECT.
 * Rejects protocol-relative, absolute, backslash, scheme and userinfo tricks,
 * control characters (a "/\t/evil.com" style path parses cross-origin in WHATWG URL),
 * and any /login path, matched case-insensitively after decoding (avoids redirect loops).
 */
export function safeRedirect(candidate: unknown): string {
  if (typeof candidate !== "string") return DEFAULT_REDIRECT;
  // Checked on the raw value: trim() would otherwise hide "/\t" as "/".
  if (CONTROL_CHARS.test(candidate)) return DEFAULT_REDIRECT;
  const path = candidate.trim();
  if (!path.startsWith("/")) return DEFAULT_REDIRECT;
  if (path.startsWith("//")) return DEFAULT_REDIRECT;
  if (isLoginLoopPath(path)) return DEFAULT_REDIRECT;
  if (path.includes("\\")) return DEFAULT_REDIRECT;
  if (path.includes("://")) return DEFAULT_REDIRECT;
  if (path.includes("@")) return DEFAULT_REDIRECT;
  return path;
}

export function saveAuthRedirect(path: string): void {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, safeRedirect(path));
    }
  } catch {
    // storage unavailable (private mode) — redirect falls back to default
  }
}

export function peekAuthRedirect(): string | null {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(REDIRECT_STORAGE_KEY);
      return raw ? safeRedirect(raw) : null;
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearAuthRedirect(): void {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

/** Reads and clears the stored post-login redirect; falls back to DEFAULT_REDIRECT. */
export function consumeAuthRedirect(): string {
  const stored = peekAuthRedirect();
  if (stored) clearAuthRedirect();
  return stored ?? DEFAULT_REDIRECT;
}

/** OAuth/email callbacks use the current app origin, or the published app during SSR. */
export function authCallbackUrl(): string {
  return `${appOrigin()}/login`;
}

/** True when the URL carries an OAuth error (e.g. ?error=access_denied). */
export function hasAuthErrorInUrl(search: string): boolean {
  try {
    const params = new URLSearchParams(search);
    return params.has("error") || params.has("error_description");
  } catch {
    return false;
  }
}
