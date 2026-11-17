import { describe, expect, it } from "vitest";
import {
  DOMAIN_INPUT_EMPTY_ERROR,
  DOMAIN_INPUT_INVALID_ERROR,
  domainInputError,
  parseDomainInput,
} from "./domain-input";

describe("parseDomainInput", () => {
  it("accepts a bare hostname", () => {
    expect(parseDomainInput("example.sk")).toBe("example.sk");
  });

  it("normalizes an https URL with www, path and query to the hostname", () => {
    expect(parseDomainInput("https://www.example.sk/path?q=1")).toBe("example.sk");
  });

  it("accepts http, mixed case, a trailing dot and surrounding whitespace", () => {
    expect(parseDomainInput("  HTTP://Example.SK.  ")).toBe("example.sk");
  });

  it("accepts a protocol-relative URL", () => {
    expect(parseDomainInput("//www.example.sk/cesta")).toBe("example.sk");
  });

  it.each([
    "",
    "   ",
    "garbage",
    "not a domain",
    "http://",
    "https://localhost",
    "https://127.0.0.1",
    "ftp://example.sk",
    "javascript:alert(1)",
    "example",
    "-example.sk",
  ])("rejects %j", (input) => {
    expect(parseDomainInput(input)).toBeNull();
  });

  it("accepts a bare hostname with a trailing path slash via URL parsing", () => {
    expect(parseDomainInput("example.sk/")).toBe("example.sk");
  });
});

describe("domainInputError", () => {
  it("asks for a domain when the field is empty", () => {
    expect(domainInputError("")).toBe(DOMAIN_INPUT_EMPTY_ERROR);
    expect(domainInputError("  ")).toBe(DOMAIN_INPUT_EMPTY_ERROR);
  });

  it("explains invalid input in Slovak", () => {
    expect(domainInputError("!!!")).toBe(DOMAIN_INPUT_INVALID_ERROR);
  });

  it("returns null for a valid domain", () => {
    expect(domainInputError("example.sk")).toBeNull();
  });
});
