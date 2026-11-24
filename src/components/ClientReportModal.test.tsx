import type * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Mock @radix-ui/react-dialog Portal to render inline in SSR
vi.mock("@radix-ui/react-dialog", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@radix-ui/react-dialog");
  return {
    ...actual,
    Portal: ({ children }: { children?: React.ReactNode }) => (
      <div data-radix-portal="">{children}</div>
    ),
  };
});

// Mock @tanstack/react-router Link component
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Supabase client to avoid database queries in unit test
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
          order: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    }),
  },
}));

import { ClientReportModal } from "./ClientReportModal";

describe("ClientReportModal mobile responsivity & 100dvh structure", () => {
  it("renders with 100dvh container classes for mobile and centered modal for desktop", () => {
    const html = renderToStaticMarkup(
      <ClientReportModal
        open={true}
        onOpenChange={() => {}}
        siteUrl="sc-domain:eshop-klienta.sk"
      />,
    );

    // Verify 100dvh and mobile viewport classes
    expect(html).toContain("h-[100dvh]");
    expect(html).toContain("max-h-[100dvh]");
    expect(html).toContain("inset-0");
    expect(html).toContain("sm:inset-auto");
    expect(html).toContain("sm:max-h-[92vh]");

    // Verify iOS Safe Area insets
    expect(html).toContain("env(safe-area-inset-top");
    expect(html).toContain("env(safe-area-inset-bottom");

    // Verify responsive action buttons
    expect(html).toContain("Zdieľať");
    expect(html).toContain("Branding");
    expect(html).toContain("PDF");
    expect(html).toContain("Stiahnuť PDF");

    // Verify modal header and content
    expect(html).toContain("Mesačný SEO Report pre klienta");
    expect(html).toContain("eshop-klienta.sk");
    expect(html).toContain("SEO Health Index");
  });

  it("renders when dataset and summary metrics are provided", () => {
    const html = renderToStaticMarkup(
      <ClientReportModal
        open={true}
        onOpenChange={() => {}}
        siteUrl="https://example.com"
        summary={{
          pages: 42,
          clicksNow: 1250,
          clicksPrev: 1000,
          impressionsNow: 45000,
          impressionsPrev: 40000,
          avgPositionNow: 8.4,
          avgPositionPrev: 9.1,
        }}
      />,
    );

    const fmt = (n: number) => new Intl.NumberFormat("sk-SK").format(Math.round(n));

    expect(html).toContain("example.com");
    expect(html).toContain("42");
    expect(html).toContain(fmt(1250));
    expect(html).toContain(fmt(45000));
  });
});
