// @vitest-environment happy-dom
import { act, createElement, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { Route } from "./serplab";

vi.mock("@/components/AppHeader", () => ({ AppHeader: () => null }));
vi.mock("@/components/PaywallModal", () => ({ PaywallModal: () => null }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/hooks/use-viewer-role", () => ({
  useViewerRole: () => ({ isAdmin: false, plan: "free" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

it("restores edited product metadata and FAQ configuration on Reset", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    const Page = Route.options.component as ComponentType & { preload?: () => Promise<unknown> };
    await Page.preload?.();
    await act(async () => root.render(createElement(Page)));
    const brand = host.querySelector<HTMLInputElement>("#input-brand")!;
    const slug = host.querySelector<HTMLInputElement>("#input-url-slug")!;
    const faq = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    const initial = [brand.value, slug.value, faq.checked];
    await act(async () => {
      for (const input of [brand, slug]) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
          input,
          "test-salon",
        );
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      faq.click();
    });
    expect([brand.value, slug.value, faq.checked]).toEqual(["test-salon", "test-salon", false]);
    await act(async () => host.querySelector<HTMLButtonElement>("#btn-refresh")!.click());
    expect([brand.value, slug.value, faq.checked]).toEqual(initial);
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
