import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { PrivacyContent } from "@/components/legal/LegalContent";

export const Route = createFileRoute("/ochrana-osobnych-udajov")({
  head: () => ({
    meta: [
      { title: "Ochrana osobných údajov | SEO4WEB" },
      {
        name: "description",
        content:
          "Zásady ochrany osobných údajov Seo4web: aké údaje spracúvame, právny základ, sprostredkovatelia a vaše práva podľa GDPR.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalLayout title="Ochrana osobných údajov">
      <PrivacyContent />
    </LegalLayout>
  );
}
