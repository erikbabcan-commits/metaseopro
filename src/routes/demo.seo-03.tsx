import { createFileRoute } from "@tanstack/react-router";
import { TrendingDown } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Seo03Demo } from "@/components/Seo03Demo";

export const Route = createFileRoute("/demo/seo-03")({
  head: () => ({
    meta: [
      { title: "SEO-03 demo — pokles kliknutí zo Search Console | SEO4WEB" },
      {
        name: "description",
        content:
          "Lokálne demo: nahraj CSV export stránok zo Search Console a uvidíš tri stránky s najväčšou stratou kliknutí a čo na nich opraviť.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Seo03DemoPage,
});

function Seo03DemoPage() {
  return (
    <div className="min-h-screen bg-page-bg font-sans text-foreground">
      <div className="print:hidden">
        <AppHeader />
      </div>
      <main className="px-4 pb-24 md:px-6">
        <div className="mx-auto max-w-screen-xl">
          <div className="py-6 md:py-8 print:hidden">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <TrendingDown className="size-5" aria-hidden />
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase">
                Demo SEO-03
              </span>
            </div>
            <h1 className="mb-3 font-display text-3xl leading-tight text-balance text-foreground md:text-5xl">
              Ktoré tri stránky stratili najviac kliknutí?
            </h1>
            <p className="max-w-[60ch] text-base text-secondary-foreground text-pretty md:text-lg">
              Nahraj export stránok zo Search Console s porovnaním dvoch období. Za pár sekúnd
              uvidíš najväčšie straty, čo opraviť ako prvé a report pre klienta.
            </p>
          </div>
          <Seo03Demo />
        </div>
      </main>
    </div>
  );
}
