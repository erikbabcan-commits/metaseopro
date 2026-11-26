import { SITE } from "@/lib/i18n";

/**
 * Canonical URL for the current route: SITE + pathname, without query or hash.
 * Returns null (=> no canonical tag) for anything that is not a same-origin
 * http(s) path, e.g. "javascript:", "data:", protocol-relative "//evil.tld" or
 * absolute URLs to another host.
 */
export function canonicalForPath(
  pathname: string | undefined | null,
  site: string = SITE,
): string | null {
  if (typeof pathname !== "string" || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return null;
  }
  if (/[\\\s]/.test(pathname)) return null;
  let url: URL;
  let base: URL;
  try {
    base = new URL(site);
    url = new URL(pathname, base);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.origin !== base.origin) return null;
  let path = url.pathname;
  if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "") || "/";
  return path === "/" ? base.origin : `${base.origin}${path}`;
}

type MatchLike = { pathname?: string; _notFound?: boolean; status?: string };

/** Canonical for the deepest match; null on not-found/error so 404s never claim a canonical. */
export function canonicalForMatches(
  matches: readonly MatchLike[] | undefined,
  site: string = SITE,
): string | null {
  if (!matches || matches.length === 0) return null;
  if (matches.some((m) => m._notFound || m.status === "notFound" || m.status === "error")) {
    return null;
  }
  return canonicalForPath(matches[matches.length - 1].pathname, site);
}
