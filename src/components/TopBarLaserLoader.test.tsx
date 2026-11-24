import type * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TopBarLaserLoader } from "./TopBarLaserLoader";
import { startLaserProgress, stopLaserProgress } from "@/lib/laser-loader";

// Mock @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
  useRouterState: vi.fn(({ select }) =>
    select ? select({ isLoading: false, status: "idle" }) : { isLoading: false, status: "idle" },
  ),
}));

// Mock @tanstack/react-query
vi.mock("@tanstack/react-query", () => ({
  useIsFetching: vi.fn(() => 0),
}));

describe("TopBarLaserLoader", () => {
  it("renders null or hidden when idle", () => {
    const html = renderToStaticMarkup(<TopBarLaserLoader />);
    // When progress is 0 and not visible, it returns null or hidden
    expect(html).toBe("");
  });

  it("exports startLaserProgress and stopLaserProgress helper functions", () => {
    expect(typeof startLaserProgress).toBe("function");
    expect(typeof stopLaserProgress).toBe("function");
    // Calling them in test environment without DOM should not throw
    expect(() => startLaserProgress()).not.toThrow();
    expect(() => stopLaserProgress()).not.toThrow();
  });
});
