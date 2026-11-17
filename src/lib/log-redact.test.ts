import { describe, expect, it } from "vitest";
import { maskEmail, redactEmails, safeErrorForLog } from "./log-redact";

describe("log-redact", () => {
  it("masks e-mail addresses", () => {
    expect(maskEmail("jan.novak@example.sk")).toBe("j***@e***");
    expect(maskEmail("")).toBe("***");
    expect(maskEmail("no-at-sign")).toBe("***");
    expect(maskEmail(undefined)).toBe("***");
  });

  it("redacts every e-mail inside free text", () => {
    const out = redactEmails('{"error":"invalid to a.b+c@firma.example.sk and x@y.io"}');
    expect(out).not.toContain("@firma");
    expect(out).not.toContain("x@y.io");
    expect(out).toContain("[redacted-email]");
  });

  it("safeErrorForLog strips e-mails from error messages", () => {
    const out = safeErrorForLog(new Error("send failed for klient@eshop.sk"));
    expect(out).not.toContain("klient@eshop.sk");
    expect(out).toContain("send failed");
  });
});
