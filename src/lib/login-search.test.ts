import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loginDestination,
  loginSearchForMode,
  parseLoginMode,
  parseLoginSearch,
  rememberLoginRedirect,
} from "./login-search";
import { consumeAuthRedirect, peekAuthRedirect, saveAuthRedirect } from "./safe-auth-redirect";

afterEach(() => {
  vi.unstubAllGlobals();
});

const stubBrowser = (withStorage = true) => {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    location: { origin: "https://metaseopro.vercel.app", search: "" },
    sessionStorage: withStorage
      ? {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => void store.set(k, v),
          removeItem: (k: string) => void store.delete(k),
        }
      : undefined,
  });
};

describe("parseLoginMode", () => {
  it("selects signup only for the exact signup value", () => {
    expect(parseLoginMode("signup")).toBe("signup");
  });

  it.each([
    { value: "signin" as const, label: "signin literal" },
    { value: undefined, label: "missing" },
    { value: null, label: "null" },
    { value: "", label: "empty string" },
    { value: "SIGNUP", label: "wrong case" },
    { value: "register", label: "unknown string" },
    { value: 1, label: "number" },
    { value: true, label: "boolean" },
    { value: ["signup"], label: "array" },
    { value: { mode: "signup" }, label: "object" },
  ])("falls back to signin for $label", ({ value }) => {
    expect(parseLoginMode(value)).toBe("signin");
  });
});

describe("parseLoginSearch", () => {
  it("keeps a safe redirect and omits mode for default sign-in", () => {
    expect(parseLoginSearch({ redirect: "/audit?domain=example.sk" })).toEqual({
      redirect: "/audit?domain=example.sk",
    });
  });

  it("adds mode=signup when requested", () => {
    expect(parseLoginSearch({ redirect: "/audit", mode: "signup" })).toEqual({
      redirect: "/audit",
      mode: "signup",
    });
  });

  it("drops invalid mode and unsafe redirect together", () => {
    expect(parseLoginSearch({ redirect: "https://evil.example", mode: "nope" })).toEqual({
      redirect: "/dashboard",
    });
  });
});

describe("sticky redirect fix (46da7b7) — parseLoginSearch", () => {
  it("returns no redirect key when ?redirect is absent", () => {
    expect(parseLoginSearch({})).toEqual({});
    expect("redirect" in parseLoginSearch({})).toBe(false);
    expect(parseLoginSearch({ mode: "signup" })).toEqual({ mode: "signup" });
  });

  it.each([
    { value: "", label: "empty string" },
    { value: undefined, label: "undefined" },
    { value: null, label: "null" },
    { value: 5, label: "number" },
    { value: ["/brief"], label: "array" },
    { value: { redirect: "/brief" }, label: "object" },
  ])("returns no redirect key for $label", ({ value }) => {
    expect("redirect" in parseLoginSearch({ redirect: value })).toBe(false);
  });

  it("keeps an explicit safe redirect and sanitizes an unsafe one to /dashboard", () => {
    expect(parseLoginSearch({ redirect: "/brief" })).toEqual({ redirect: "/brief" });
    expect(parseLoginSearch({ redirect: "//evil.com" })).toEqual({ redirect: "/dashboard" });
  });
});

describe("sticky redirect fix (46da7b7) — rememberLoginRedirect", () => {
  it("an explicit ?redirect overrides a saved target", () => {
    stubBrowser();
    saveAuthRedirect("/audit?domain=old.sk");
    rememberLoginRedirect(parseLoginSearch({ redirect: "/brief" }).redirect);
    expect(consumeAuthRedirect()).toBe("/brief");
  });

  it("an absent ?redirect keeps the saved target (landing → /login?mode=signup)", () => {
    stubBrowser();
    saveAuthRedirect("/audit?domain=example.sk");
    rememberLoginRedirect(parseLoginSearch({ mode: "signup" }).redirect);
    expect(consumeAuthRedirect()).toBe("/audit?domain=example.sk");
  });

  it("empty or invalid input does not overwrite the saved target", () => {
    stubBrowser();
    saveAuthRedirect("/audit?domain=example.sk");
    rememberLoginRedirect(parseLoginSearch({ redirect: "" }).redirect);
    rememberLoginRedirect(parseLoginSearch({ redirect: null }).redirect);
    rememberLoginRedirect(parseLoginSearch({ redirect: 42 }).redirect);
    rememberLoginRedirect(undefined);
    expect(peekAuthRedirect()).toBe("/audit?domain=example.sk");
  });

  it("a bare /login visit with nothing saved stores nothing (falls back to /dashboard)", () => {
    stubBrowser();
    rememberLoginRedirect(parseLoginSearch({}).redirect);
    expect(peekAuthRedirect()).toBeNull();
    expect(consumeAuthRedirect()).toBe("/dashboard");
  });

  it("/login then /login?redirect=/brief ends on /brief", () => {
    stubBrowser();
    rememberLoginRedirect(parseLoginSearch({}).redirect);
    rememberLoginRedirect(parseLoginSearch({ redirect: "/brief" }).redirect);
    expect(consumeAuthRedirect()).toBe("/brief");
  });

  it("an unsafe explicit redirect is stored as the safe default, never as given", () => {
    stubBrowser();
    rememberLoginRedirect(parseLoginSearch({ redirect: "https://evil.example" }).redirect);
    expect(consumeAuthRedirect()).toBe("/dashboard");
  });

  it("does not throw without storage", () => {
    stubBrowser(false);
    expect(() => rememberLoginRedirect("/brief")).not.toThrow();
  });
});

describe("parseLoginSearch — ?next= alias", () => {
  it("keeps a safe next path", () => {
    expect(parseLoginSearch({ next: "/audit" })).toEqual({ next: "/audit" });
  });

  it("keeps next with a query string", () => {
    expect(parseLoginSearch({ next: "/audit?domain=example.sk" })).toEqual({
      next: "/audit?domain=example.sk",
    });
  });

  it("sanitizes an unsafe next to /dashboard (open-redirect guard)", () => {
    expect(parseLoginSearch({ next: "https://evil.example" })).toEqual({ next: "/dashboard" });
    expect(parseLoginSearch({ next: "//evil.com" })).toEqual({ next: "/dashboard" });
    expect(parseLoginSearch({ next: "audit" })).toEqual({ next: "/dashboard" });
  });

  it("returns no next key when ?next is absent or empty", () => {
    expect("next" in parseLoginSearch({})).toBe(false);
    expect("next" in parseLoginSearch({ next: "" })).toBe(false);
    expect("next" in parseLoginSearch({ next: null })).toBe(false);
  });

  it("keeps next and redirect independently when both are safe", () => {
    expect(parseLoginSearch({ next: "/audit", redirect: "/brief" })).toEqual({
      next: "/audit",
      redirect: "/brief",
    });
  });
});

describe("loginDestination", () => {
  it("prefers next over redirect", () => {
    expect(loginDestination({ next: "/audit", redirect: "/brief" })).toBe("/audit");
  });

  it("falls back to redirect when next is absent", () => {
    expect(loginDestination({ redirect: "/brief" })).toBe("/brief");
    expect(loginDestination({})).toBeUndefined();
  });
});

describe("loginSearchForMode", () => {
  it("preserves next when toggling mode", () => {
    expect(loginSearchForMode({ next: "/audit" }, "signup")).toEqual({
      next: "/audit",
      mode: "signup",
    });
    expect(loginSearchForMode({ next: "/audit", mode: "signup" }, "signin")).toEqual({
      next: "/audit",
    });
  });
});

describe("sticky redirect — rememberLoginRedirect with ?next=", () => {
  it("an explicit ?next overrides a saved target", () => {
    stubBrowser();
    saveAuthRedirect("/brief");
    rememberLoginRedirect(loginDestination(parseLoginSearch({ next: "/audit" })));
    expect(consumeAuthRedirect()).toBe("/audit");
  });

  it("an unsafe ?next is stored as the safe default, never as given", () => {
    stubBrowser();
    rememberLoginRedirect(loginDestination(parseLoginSearch({ next: "https://evil.example" })));
    expect(consumeAuthRedirect()).toBe("/dashboard");
  });

  it("an absent ?next keeps the saved target", () => {
    stubBrowser();
    saveAuthRedirect("/audit");
    rememberLoginRedirect(loginDestination(parseLoginSearch({ mode: "signup" })));
    expect(consumeAuthRedirect()).toBe("/audit");
  });
});
