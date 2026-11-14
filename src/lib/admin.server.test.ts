import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminUser } from "./admin.server";

afterEach(() => {
  vi.unstubAllEnvs();
});

const unsetBoth = () => {
  vi.stubEnv("ADMIN_USER_IDS", "");
  vi.stubEnv("ADMIN_EMAILS", "");
};

describe("isAdminUser (AUD-11: ADMIN_USER_IDS primary, verified-email fallback, fail-closed)", () => {
  it("returns true when user.id is in ADMIN_USER_IDS", () => {
    vi.stubEnv("ADMIN_USER_IDS", "uuid-1, uuid-2");
    expect(isAdminUser({ id: "uuid-2" })).toBe(true);
  });

  it("returns false when user.id is not in ADMIN_USER_IDS", () => {
    vi.stubEnv("ADMIN_USER_IDS", "uuid-1");
    expect(isAdminUser({ id: "uuid-9" })).toBe(false);
  });

  it("ignores whitespace and empty entries in ADMIN_USER_IDS", () => {
    vi.stubEnv("ADMIN_USER_IDS", "  uuid-1 , ,uuid-2  ,");
    expect(isAdminUser({ id: "uuid-1" })).toBe(true);
    expect(isAdminUser({ id: "uuid-2" })).toBe(true);
    expect(isAdminUser({ id: "" })).toBe(false);
  });

  it("does NOT fall back to email when ADMIN_USER_IDS is configured", () => {
    vi.stubEnv("ADMIN_USER_IDS", "uuid-1");
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    expect(isAdminUser({ id: "uuid-9", email: "admin@example.com", email_verified: true })).toBe(
      false,
    );
  });

  it("falls back to ADMIN_EMAILS only for a VERIFIED email (email_verified)", () => {
    unsetBoth();
    vi.stubEnv("ADMIN_EMAILS", " Admin@Example.com ");
    expect(isAdminUser({ id: "u1", email: "admin@example.com", email_verified: true })).toBe(true);
    expect(
      isAdminUser({
        id: "u1",
        email: "ADMIN@EXAMPLE.COM",
        email_confirmed_at: "2026-01-01T00:00:00Z",
      }),
    ).toBe(true);
  });

  it("rejects an UNVERIFIED email even when it is in ADMIN_EMAILS", () => {
    unsetBoth();
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    expect(isAdminUser({ id: "u1", email: "admin@example.com" })).toBe(false);
    expect(isAdminUser({ id: "u1", email: "admin@example.com", email_verified: false })).toBe(
      false,
    );
    expect(isAdminUser({ id: "u1", email: "admin@example.com", email_confirmed_at: null })).toBe(
      false,
    );
  });

  it("rejects a verified email that is not in ADMIN_EMAILS", () => {
    unsetBoth();
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    expect(isAdminUser({ id: "u1", email: "other@example.com", email_verified: true })).toBe(false);
  });

  it("returns false when neither ADMIN_USER_IDS nor ADMIN_EMAILS is configured (fail-closed)", () => {
    unsetBoth();
    expect(isAdminUser({ id: "uuid-1", email: "admin@example.com", email_verified: true })).toBe(
      false,
    );
  });

  it("returns false for a missing user or missing id", () => {
    vi.stubEnv("ADMIN_USER_IDS", "uuid-1");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isAdminUser(undefined as any)).toBe(false);
    expect(isAdminUser({ id: "" })).toBe(false);
  });
});
