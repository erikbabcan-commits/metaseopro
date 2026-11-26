import { faqData, type FaqEntry } from "@/components/landing/faq-data";
import { OG_IMAGE, SITE } from "@/lib/i18n";

const SITE_NAME = "SEO4WEB";
const SITE_DESCRIPTION =
  "SEO4WEB: Inteligentný SEO audit, detekcia prepadov návštevnosti (Content Decay), CTR booster a 1-klikové nasadzovanie optimalizácií do WordPressu.";

/**
 * JSON-LD for the public landing page. Only facts that are visible on the site:
 * no offers/prices, no ratings. The FAQPage mirrors the visible FAQ section 1:1.
 */
export function buildLandingJsonLd(faq: readonly FaqEntry[] = faqData) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: SITE_NAME,
      url: SITE,
      logo: `${SITE}/android-chrome-512x512.png`,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": `${SITE}/#software`,
      name: SITE_NAME,
      url: SITE,
      description: SITE_DESCRIPTION,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      image: OG_IMAGE,
      publisher: { "@id": `${SITE}/#organization` },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${SITE}/#faq`,
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];
}

/** Serialize for an inline <script type="application/ld+json"> (escapes "<" so "</script>" cannot break out). */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
