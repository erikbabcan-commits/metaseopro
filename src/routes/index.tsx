import { createFileRoute } from "@tanstack/react-router";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingMetrics } from "@/components/landing/LandingMetrics";
import { LandingAiWriterDemo } from "@/components/landing/LandingAiWriterDemo";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { buildLandingJsonLd, serializeJsonLd } from "@/lib/landing-jsonld";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seo4web - Autentická SEO analýza & AI Writer pre slovenský trh" },
      {
        name: "description",
        content:
          "On-page SEO audit domén, porovnanie s konkurenciou a generátor obsahu pre Google. SEO nástroje pre slovenské e-shopy a weby.",
      },
      { property: "og:title", content: "Seo4web - Autentická SEO analýza & AI Writer" },
      {
        property: "og:description",
        content:
          "On-page SEO audit domén, porovnanie s konkurenciou a generátor obsahu pre Google.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://seo.vorkei.com/og-seo-vorkei.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Seo4web - Autentická SEO analýza & AI Writer" },
      {
        name: "twitter:description",
        content:
          "On-page SEO audit domén, porovnanie s konkurenciou a generátor obsahu pre Google.",
      },
    ],
    scripts: buildLandingJsonLd().map((node) => ({
      type: "application/ld+json",
      children: serializeJsonLd(node),
    })),
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-on-surface antialiased font-sans selection:bg-primary-fixed selection:text-on-primary-fixed-variant">
      {/* 1. Header (Sticky Top Navigation) */}
      <LandingHeader />

      {/* Main Content Sections */}
      <main className="flex-grow">
        {/* 2. Hero Section with Typewriter Search & Laser Pill */}
        <LandingHero />

        {/* 3. Metrics / KPI 4-Card Bento Grid */}
        <LandingMetrics />

        {/* 4. Live AI Writer Demo Streamer */}
        <LandingAiWriterDemo />

        {/* 5. Pricing Calculator with Domain Range Slider & Yearly Discount */}
        <LandingPricing />

        {/* 6. FAQ Accordion */}
        <LandingFaq />

        {/* 7. Bottom CTA & Footer */}
        <LandingFooter />
      </main>
    </div>
  );
}
