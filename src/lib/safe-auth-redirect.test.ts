import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appOrigin,
  authCallbackUrl,
  clearAuthRedirect,
  consumeAuthRedirect,
  DEFAULT_APP_ORIGIN,
  hasAuthErrorInUrl,
  peekAuthRedirect,
  safeRedirect,
  saveAuthRedirect,
} from "./safe-auth-redirect";

afterEach(() => {
  vi.unstubAllGlobals();
});

const stubBrowser = (origin: string | undefined, withStorage = true) => {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  vi.stubGlobal("window", {
    location: { origin, search: "" },
    sessionStorage: withStorage ? sessionStorage : undefined,
  });
  return store;
};

describe("safeRedirect — happy path", () => {
  it("allows relative same-origin paths", () => {
    expect(safeRedirect("/dashboard")).toBe("/dashboard");
    expect(safeRedirect("/audit")).toBe("/audit");
    expect(safeRedirect("/decay?site=x")).toBe("/decay?site=x");
    expect(safeRedirect("/")).toBe("/");
  });
});

describe("safeRedirect — open-redirect cases are rejected to /dashboard", () => {
  it.each<[unknown, string]>([
    ["//evil.com", "protocol-relative"],
    ["https://evil.com", "absolute https"],
    ["http://evil.com/x", "absolute http"],
    ["\\\\evil.com", "backslash"],
    ["/\\evil.com", "backslash after slash"],
    ["/redirect?to=https://evil.com", "scheme inside query"],
    ["/@evil.com", "userinfo-like"],
    ["javascript:alert(1)", "scheme"],
    ["/login", "login loop"],
    ["/login?redirect=/audit", "login with redirect"],
    ["", "empty"],
    [undefined, "undefined"],
    [123, "non-string"],
    ["   ", "whitespace"],
  ])("rejects %s (%s)", (input) => {
    expect(safeRedirect(input)).toBe("/dashboard");
  });
});

describe("safeRedirect — control characters and backslashes (#18 P3-3)", () => {
  it.each<[string, string]>([
    ["/\t/evil.com", "tab then protocol-relative"],
    ["/\n/evil.com", "newline then protocol-relative"],
    ["/\r/evil.com", "carriage return then protocol-relative"],
    ["/\t", "bare /\\t"],
    ["/\\", "bare /\\ (backslash)"],
    ["/\\evil.com", "backslash host"],
    ["/audit\u0000x", "NUL (\\x00)"],
    ["/audit\u0001", "SOH (\\x01)"],
    ["/a\u001fb", "unit separator (\\x1F)"],
    ["/a\u007fb", "DEL (\\x7F)"],
    ["/audit?domain=a.sk\u000bx", "vertical tab in query"],
    ["/audit?domain=a.sk\u000cx", "form feed in query"],
  ])("rejects %j (%s)", (input) => {
    expect(safeRedirect(input)).toBe("/dashboard");
  });

  it("still allows normal paths with encoded characters", () => {
    expect(safeRedirect("/%09/x")).toBe("/%09/x");
    expect(safeRedirect("/audit?domain=a.sk&x=%0A")).toBe("/audit?domain=a.sk&x=%0A");
  });

  it("covers every C0 control character and DEL", () => {
    for (let code = 0; code <= 0x1f; code += 1) {
      expect(safeRedirect(`/a${String.fromCharCode(code)}b`)).toBe("/dashboard");
    }
    expect(safeRedirect(`/a${String.fromCharCode(0x7f)}b`)).toBe("/dashboard");
  });
});

describe("appOrigin", () => {
  it.each([
    "https://seo4web.lovable.app",
    "https://seo.vorkei.com",
    "https://metaseopro.vercel.app",
    "https://metaseopro-preview.vercel.app",
  ])("uses the current app origin %s when present", (origin) => {
    stubBrowser(origin);
    expect(appOrigin()).toBe(origin);
    expect(authCallbackUrl()).toBe(`${origin}/login`);
  });

  it("falls back to the published Lovable origin when window/origin is missing or 'null'", () => {
    expect(DEFAULT_APP_ORIGIN).toBe("https://seo4web.lovable.app");
    vi.stubGlobal("window", undefined);
    expect(appOrigin()).toBe(DEFAULT_APP_ORIGIN);
    expect(authCallbackUrl()).toBe(`${DEFAULT_APP_ORIGIN}/login`);
    stubBrowser("null");
    expect(appOrigin()).toBe(DEFAULT_APP_ORIGIN);
    stubBrowser(undefined);
    expect(appOrigin()).toBe(DEFAULT_APP_ORIGIN);
  });

  it("uses localhost origin during local development", () => {
    stubBrowser("http://localhost:5173");
    expect(authCallbackUrl()).toBe("http://localhost:5173/login");
  });
});

describe("sessionStorage post-login redirect", () => {
  it("saves a sanitized path and consumes it once", () => {
    stubBrowser("https://metaseopro.vercel.app");
    saveAuthRedirect("/audit");
    expect(peekAuthRedirect()).toBe("/audit");
    expect(consumeAuthRedirect()).toBe("/audit");
    expect(peekAuthRedirect()).toBeNull(); // consumed
    expect(consumeAuthRedirect()).toBe("/dashboard"); // default afterwards
  });

  it("sanitizes an unsafe value before storing", () => {
    stubBrowser("https://metaseopro.vercel.app");
    saveAuthRedirect("//evil.com");
    expect(peekAuthRedirect()).toBe("/dashboard");
    clearAuthRedirect();
    expect(peekAuthRedirect()).toBeNull();
  });

  it("works without storage (private mode) — no throw, defaults apply", () => {
    stubBrowser("https://metaseopro.vercel.app", false);
    expect(() => saveAuthRedirect("/audit")).not.toThrow();
    expect(peekAuthRedirect()).toBeNull();
    expect(consumeAuthRedirect()).toBe("/dashboard");
  });
});

describe("hasAuthErrorInUrl", () => {
  it("detects OAuth error params", () => {
    expect(hasAuthErrorInUrl("?error=access_denied")).toBe(true);
    expect(hasAuthErrorInUrl("?error_description=x&error=y")).toBe(true);
    expect(hasAuthErrorInUrl("?redirect=/audit")).toBe(false);
    expect(hasAuthErrorInUrl("")).toBe(false);
  });
});
