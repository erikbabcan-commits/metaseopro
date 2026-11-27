// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, createElement, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Route } from "./pagespeed";
import { runPageSpeedFn } from "@/lib/pagespeed-fn";

vi.mock("@/components/AppHeader", () => ({ AppHeader: () => null }));
vi.mock("sonner", () => ({ Toaster: () => null, toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/pagespeed-fn", () => ({ runPageSpeedFn: vi.fn() }));
let root: Root;
let host: HTMLDivElement;
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  const Component = Route.options.component as ComponentType & { preload?: () => Promise<unknown> };
  await Component.preload?.();
  await act(async () => root.render(createElement(Component)));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});
async function typeUrl(value: string) {
  const input = host.querySelector('input[type="text"]') as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function button(text: string) {
  return [...host.querySelectorAll("button")].find((b) => b.textContent?.includes(text))!;
}
it("keeps sample values out of a new domain, measured output, printout and failed retry", async () => {
  expect(host.querySelector("#pagespeed-a4-page-1")).toBeTruthy();
  await typeUrl("salon.example");
  expect(host.querySelector("#pagespeed-a4-page-1")).toBeNull();
  expect(button("Stiahnuť PDF").disabled).toBe(true);
  const metric = { value: null, displayValue: null, score: null };
  vi.mocked(runPageSpeedFn).mockResolvedValueOnce({
    url: "https://salon.example/",
    strategy: "mobile",
    cached: false,
    fetchedAt: "2026-11-27T12:00:00Z",
    scores: { performance: 47, seo: null, accessibility: null, bestPractices: null },
    metrics: { lcp: metric, cls: metric, fcp: metric, tbt: metric, ttfb: metric },
    opportunities: [],
  });
  await act(async () => button("Zmerať cez PageSpeed API").click());
  const report = host.querySelector('article[aria-label="Výsledok merania"]')!;
  expect(report.textContent).toContain("https://salon.example/");
  expect(report.textContent).toContain("47");
  expect(report.textContent).toContain("Údaj nie je dostupný");
  expect(host.querySelector("#pagespeed-a4-page-1")).toBeNull();
  await typeUrl("druhy.example");
  vi.mocked(runPageSpeedFn).mockRejectedValueOnce(new Error("Služba je nedostupná"));
  await act(async () => button("Zmerať cez PageSpeed API").click());
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Služba je nedostupná");
  expect(host.querySelector("article")).toBeNull();
  expect(button("Stiahnuť PDF").disabled).toBe(true);
  expect((host.querySelector('input[type="text"]') as HTMLInputElement).value).toBe(
    "druhy.example",
  );
});
