// @vitest-environment happy-dom
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuickUrlInspection } from "./QuickUrlInspection";

const { crawlSiteFn } = vi.hoisted(() => ({ crawlSiteFn: vi.fn() }));
vi.mock("@/lib/crawler.functions", () => ({ crawlSiteFn }));

const articleCanonical = "https://papihairdesign.sk/blog/uces-na-firemny-vecierok";
const article = {
  url: `${articleCanonical}?utm_source=seo4web&ref=dashboard`,
  title: "Účes na firemný večierok v Košiciach | PAPI HAIR DESIGN",
  description:
    "Stačí fúkaná alebo si vybrať spoločenský účes? Tipy na krátke aj dlhé vlasy, pánsky strih a výber služby pred večierkom v Košiciach.",
  canonical: articleCanonical,
  h1: ["Účes na firemný večierok: kedy stačí fúkaná a kedy si vlasy vypnúť?"],
  status: 200,
  findings: [],
};
const pricing = {
  url: "https://papihairdesign.sk/cennik",
  title: "Cenník kaderníctva Košice | PAPI HAIR DESIGN",
  description:
    "Ceny dámskych a pánskych strihov, farbenia, balayage, ombre a vlasových kúr v PAPI HAIR DESIGN Košice. Konečnú cenu upresníme pri konzultácii.",
  canonical: "https://papihairdesign.sk/cennik",
  h1: ["Cenník kaderníctva Košice"],
  status: 200,
  findings: [],
};
const missingUrl = "https://papihairdesign.sk/seo4web-test-neexistujuca-stranka";

let container: HTMLDivElement;
let root: Root;
let input: HTMLInputElement;
let button: HTMLButtonElement;

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  crawlSiteFn.mockReset();
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory({ initialEntries: ["/dashboard"] }),
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(() =>
    root.render(
      <RouterContextProvider router={router}>
        <QuickUrlInspection />
      </RouterContextProvider>,
    ),
  );
  input = container.querySelector<HTMLInputElement>(
    'input[aria-label="URL podstránky na inšpekciu"]',
  )!;
  button = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function submit(url: string) {
  await act(() => {
    input.value = url;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    button.click();
  });
}

function expectResult(page: typeof article) {
  const values = [...container.querySelectorAll("dl dt")].map((label) => [
    label.textContent,
    label.nextElementSibling?.textContent,
  ]);
  expect(Object.fromEntries(values)).toEqual({
    "Analyzovaná URL": page.url,
    Titulok: page.title,
    "Meta description": page.description,
    Canonical: page.canonical,
    H1: page.h1.join("\n"),
  });
  expect(container.querySelectorAll("dl")).toHaveLength(1);
}

describe("dashboard single-page URL inspection", () => {
  it("preserves path and query and replaces all article metadata on the next submission", async () => {
    crawlSiteFn.mockResolvedValueOnce({ pages: [article] });
    await submit(article.url);
    expect(crawlSiteFn).toHaveBeenNthCalledWith(1, {
      data: { url: article.url, singlePage: true },
    });
    expectResult(article);

    let finish!: () => void;
    crawlSiteFn.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ pages: [pricing] });
        }),
    );
    await submit(pricing.url);
    expect(crawlSiteFn).toHaveBeenNthCalledWith(2, {
      data: { url: pricing.url, singlePage: true },
    });
    expect(button.disabled).toBe(true);
    expect(container.querySelector("dl")).toBeNull();
    await act(() => finish());
    expectResult(pricing);
    expect(container.textContent).not.toContain(article.title);
  });

  it("shows a 404 for the attempted URL, clears the previous result and lets the user correct and retry", async () => {
    crawlSiteFn.mockResolvedValueOnce({ pages: [pricing] });
    await submit(pricing.url);
    expectResult(pricing);

    crawlSiteFn.mockResolvedValueOnce({ pages: [{ ...article, status: 404, url: missingUrl }] });
    await submit(missingUrl);
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("HTTP 404");
    expect(alert?.textContent).toContain(missingUrl);
    expect(input.value).toBe(missingUrl);
    expect(container.querySelector("dl")).toBeNull();
    expect(container.textContent).not.toContain(pricing.title);
    expect(button.disabled).toBe(false);

    crawlSiteFn.mockResolvedValueOnce({ pages: [article] });
    await submit(article.url);
    expect(crawlSiteFn).toHaveBeenNthCalledWith(3, {
      data: { url: article.url, singlePage: true },
    });
    expectResult(article);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
