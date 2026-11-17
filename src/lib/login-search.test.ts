import { describe, expect, it } from "vitest";
import { parseLoginMode, parseLoginSearch } from "./login-search";

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
