import { createFileRoute } from "@tanstack/react-router";
import { Seo03Demo } from "@/components/Seo03Demo";

export const Route = createFileRoute("/demo/seo-03")({
  head: () => ({
    meta: [
      { title: "SEO-03 · 90-sekundová ukážka — kde e-shop stráca kliknutia | SEO4WEB" },
      {
        name: "description",
        content:
          "Lokálna ukážka: nahrajte export stránok zo Search Console a uvidíte tri stránky s najväčšou stratou kliknutí a čo na nich opraviť ako prvé.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Seo03Demo,
});
