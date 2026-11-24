import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TactileFloatingNav } from "./TactileFloatingNav";

// Mock @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouterState: vi.fn(({ select }) =>
    select
      ? select({ location: { pathname: "/dashboard" } })
      : { location: { pathname: "/dashboard" } },
  ),
}));

// Mock @/hooks/use-auth
const mockUseAuth = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("TactileFloatingNav", () => {
  it("renders null when user is not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null });
    const html = renderToStaticMarkup(<TactileFloatingNav />);
    expect(html).toBe("");
  });

  it("renders tactile floating bar when user is logged in", () => {
    mockUseAuth.mockReturnValue({ user: { id: "user_123", email: "erikbabcan@gmail.com" } });
    const html = renderToStaticMarkup(<TactileFloatingNav />);
    expect(html).toContain("Dashboard");
    expect(html).toContain("Raketa");
    expect(html).toContain("Tvorba");
    expect(html).toContain("Radar");
    expect(html).toContain("Nástroje");
  });
});
