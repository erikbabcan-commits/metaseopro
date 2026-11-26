import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/routes/settings.agency.tsx"), "utf8");

describe("/settings/agency whitelabel badge", () => {
  it("is rendered only for the Agency plan or an admin", () => {
    const idx = source.indexOf("Whitelabel aktívny");
    expect(idx).toBeGreaterThan(0);
    const guard = source.lastIndexOf("{(isAgencyPlan || isAdmin) && (", idx);
    expect(guard).toBeGreaterThan(0);
    // the guard must be the nearest JSX condition before the badge text
    expect(source.slice(guard, idx)).not.toContain(")}");
  });

  it("no longer hard-codes a non-existent 'Agency Pro' plan name", () => {
    expect(source).not.toContain("Whitelabel aktívny (Agency Pro)");
  });
});
